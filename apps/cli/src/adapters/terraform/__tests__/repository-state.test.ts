/**
 * State migration contracts using real files and injected Terraform/cloud ports.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RepositoryStateDestination,
  RepositoryStateStorage,
} from "../../../domain/repository-state.js";

import {
  parseRepositoryState,
  verifyStateCopy,
} from "../../../domain/repository-state.js";
import { formatErrorDetailed } from "../../commander/error-reporting.js";
import {
  readRepositoryBackend,
  writeRepositoryBackend,
} from "../repository-backend.js";
import { repositoryRecoveryImportsHeader } from "../repository-imports.js";
import { prepareRepositoryState } from "../repository-state.js";

const github = { owner: "pagopa", repo: "test-repo" };
const destination: RepositoryStateDestination = {
  backend: {
    resourceGroupName: "dx-d-itn-tfstate-rg-01",
    storageAccountName: "dxditntfstatest01",
    subscriptionId: "subscription-dev",
    type: "azurerm",
  },
  containerName: "terraform-state",
  key: "dx/payments/repository.tfstate",
};

const state = (lineage = "repository-lineage", serial = 1) =>
  JSON.stringify({
    lineage,
    resources: [
      {
        instances: [
          { attributes: { full_name: "pagopa/test-repo", id: "test-repo" } },
        ],
        mode: "managed",
        module: "module.github_repository",
        name: "this",
        type: "github_repository",
      },
      {
        instances: [{ attributes: { id: "protection-main" } }],
        mode: "managed",
        module: "module.github_repository",
        name: "main",
        type: "github_branch_protection",
      },
    ],
    serial,
    version: 4,
  });

let repositoryPath: string;
let remote: string | undefined;
const commands: string[][] = [];
const read = vi.fn(async () => remote);
const run = vi.fn(async (args: string[]) => {
  commands.push(args);
  if (args.includes("-migrate-state")) {
    remote = state();
  }
  return {
    stdout:
      args[0] === "state"
        ? (remote ?? "")
        : args[0] === "workspace"
          ? "default"
          : "",
  };
});
const storage: RepositoryStateStorage = {
  read,
  withLock: async (_destination, task) => task(),
};

beforeEach(async () => {
  repositoryPath = await fs.mkdtemp(path.join(os.tmpdir(), "dx-state-test-"));
  await fs.writeFile(
    path.join(repositoryPath, "providers.tf"),
    'terraform {\n  required_providers {\n    github = {\n      source = "integrations/github"\n    }\n  }\n}\n',
  );
  await fs.mkdir(path.join(repositoryPath, ".terraform"));
  await fs.writeFile(
    path.join(repositoryPath, ".terraform", "terraform.tfstate"),
    JSON.stringify({
      backend: {
        config: {
          container_name: destination.containerName,
          key: destination.key,
          resource_group_name: destination.backend.resourceGroupName,
          storage_account_name: destination.backend.storageAccountName,
          subscription_id: destination.backend.subscriptionId,
        },
        type: "azurerm",
      },
    }),
  );
  remote = undefined;
  commands.length = 0;
  read.mockClear();
  run.mockReset();
  run.mockImplementation(async (args: string[]) => {
    commands.push(args);
    if (args.includes("-migrate-state")) {
      remote = state();
    }
    return {
      stdout:
        args[0] === "state"
          ? (remote ?? "")
          : args[0] === "workspace"
            ? "default"
            : "",
    };
  });
});

afterEach(async () => {
  await fs.rm(repositoryPath, { recursive: true });
});

const prepare = () =>
  prepareRepositoryState({
    destination,
    github,
    repositoryPath,
    run,
    storage,
  });

describe("local repository state migration", () => {
  it("migrates, verifies the actual backend, then removes local state and backups", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    await fs.writeFile(
      path.join(repositoryPath, "terraform.tfstate.backup"),
      state(),
    );

    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });
    expect(commands).toEqual([
      ["workspace", "show"],
      ["init", "-reconfigure", "-input=false"],
      ["init", "-migrate-state", "-force-copy", "-input=false"],
      ["state", "pull"],
    ]);
    await expect(readRepositoryBackend(repositoryPath)).resolves.toEqual(
      destination,
    );
    await expect(fs.readdir(repositoryPath)).resolves.toEqual([
      ".terraform",
      "providers.tf",
    ]);
  });

  it("rejects an occupied destination without writing backend configuration", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    remote = state("someone-else");

    await expect(prepare()).rejects.toThrow("refusing to adopt or overwrite");
    expect(commands).toEqual([["workspace", "show"]]);
    await expect(
      readRepositoryBackend(repositoryPath),
    ).resolves.toBeUndefined();
    await expect(
      fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
    ).resolves.toBe(state());
  });

  it("rejects empty pre-existing blobs before the first migration", async () => {
    remote = "";
    await expect(prepare()).rejects.toThrow("not valid JSON");
    expect(commands).toEqual([["workspace", "show"]]);
  });

  it("preserves state when migration fails and can safely retry", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    run.mockImplementationOnce(async () => ({ stdout: "default" }));
    run.mockRejectedValueOnce(new Error("Initialization unavailable"));

    await expect(prepare()).rejects.toThrow("Retry from the repository root");
    await expect(
      fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
    ).resolves.toBe(state());
    await expect(
      fs.readFile(
        path.join(repositoryPath, "terraform.tfstate.dx-backup"),
        "utf8",
      ),
    ).resolves.toBe(state());

    await expect(prepare()).resolves.toMatchObject({
      status: "remote-verified",
    });
  });

  it("restores the source when Terraform removes it before a failed verification", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    run.mockImplementationOnce(async () => ({ stdout: "default" }));
    run.mockImplementationOnce(async () => ({ stdout: "" }));
    run.mockImplementationOnce(async () => {
      await fs.rm(path.join(repositoryPath, "terraform.tfstate"));
      return { stdout: "" };
    });

    await expect(prepare()).rejects.toThrow("missing after migration");
    await expect(
      fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
    ).resolves.toBe(state());
    await expect(readRepositoryBackend(repositoryPath)).resolves.toEqual(
      destination,
    );
  });
});

describe("remote repository state and retries", () => {
  it("does not treat matching state contents as proof of an active remote backend", async () => {
    await writeRepositoryBackend(repositoryPath, destination);
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    remote = state();
    await fs.writeFile(
      path.join(repositoryPath, ".terraform", "terraform.tfstate"),
      JSON.stringify({ backend: { config: {}, type: "local" } }),
    );
    await expect(prepare()).rejects.toThrow(
      "has not initialized the expected Azure",
    );
    await expect(
      fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
    ).resolves.toBe(state());
  });
  it("resumes an interrupted migration from a backup with a configured backend", async () => {
    await writeRepositoryBackend(repositoryPath, destination);
    await fs.writeFile(
      path.join(repositoryPath, "terraform.tfstate.dx-backup"),
      state(),
    );

    await expect(prepare()).resolves.toMatchObject({
      status: "remote-verified",
    });
    expect(commands[1]).toEqual(["init", "-reconfigure", "-input=false"]);
    expect(commands[2]).toContain("-migrate-state");
  });

  it("reuses verified remote state without another migration", async () => {
    await writeRepositoryBackend(repositoryPath, destination);
    remote = state();

    await expect(prepare()).resolves.toMatchObject({ destination });
    expect(commands).toEqual([
      ["workspace", "show"],
      ["init", "-reconfigure", "-input=false"],
      ["state", "pull"],
    ]);
  });

  it("recognizes migration success when local cleanup previously failed", async () => {
    await writeRepositoryBackend(repositoryPath, destination);
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    remote = state("repository-lineage", 2);

    await expect(prepare()).resolves.toMatchObject({
      status: "remote-verified",
    });
    expect(commands.some((command) => command.includes("-force-copy"))).toBe(
      false,
    );
  });

  it("rejects different state lineages even when the backend is configured", async () => {
    await writeRepositoryBackend(repositoryPath, destination);
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    remote = state("different");

    await expect(prepare()).rejects.toThrow("differs from local state");
    expect(commands).toEqual([["workspace", "show"]]);
  });

  it("requires copied resources, not just matching lineage", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    run.mockImplementationOnce(async () => ({ stdout: "default" }));
    run.mockImplementationOnce(async () => ({ stdout: "" }));
    run.mockImplementationOnce(async () => {
      remote = state().replace("protection-main", "different-protection");
      return { stdout: "" };
    });

    await expect(prepare()).rejects.toThrow("differs from local state");
    await expect(
      fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
    ).resolves.toBe(state());
  });

  it("checks Terraform's selected backend before removing local files", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    run.mockImplementation(async (args) => {
      if (args.includes("-migrate-state")) remote = state();
      return {
        stdout:
          args[0] === "state"
            ? state("wrong-cache")
            : args[0] === "workspace"
              ? "default"
              : "",
      };
    });

    await expect(prepare()).rejects.toThrow("differs from local state");
    await expect(
      fs.readFile(
        path.join(repositoryPath, "terraform.tfstate.dx-backup"),
        "utf8",
      ),
    ).resolves.toBe(state());
    run.mockImplementation(async (args) => {
      commands.push(args);
      if (args.includes("-migrate-state")) remote = state();
      return {
        stdout:
          args[0] === "state"
            ? (remote ?? "")
            : args[0] === "workspace"
              ? "default"
              : "",
      };
    });
  });
});

describe("repository recovery and failure preservation", () => {
  it("recovers missing local state before reporting success", async () => {
    const recover = vi.fn(async () => {
      remote = state();
    });
    await expect(
      prepareRepositoryState({
        destination,
        github,
        recover,
        repositoryPath,
        run,
        storage,
      }),
    ).resolves.toMatchObject({ status: "remote-verified" });
    expect(recover).toHaveBeenCalledWith(repositoryPath, github, run);
    expect(commands.some((command) => command.includes("-migrate-state"))).toBe(
      false,
    );
  });

  describe("interrupted repository recovery", () => {
    it("retries a configured backend containing only an initial empty Terraform snapshot", async () => {
      await writeRepositoryBackend(repositoryPath, destination);
      remote = JSON.stringify({
        lineage: "empty-lineage",
        resources: [],
        serial: 0,
        version: 4,
      });
      const recover = vi.fn(async () => {
        remote = state();
      });
      await expect(
        prepareRepositoryState({
          destination,
          github,
          recover,
          repositoryPath,
          run,
          storage,
        }),
      ).resolves.toMatchObject({ status: "remote-verified" });
      expect(recover).toHaveBeenCalledExactlyOnceWith(
        repositoryPath,
        github,
        run,
      );
    });

    it("finishes pending imports even when a failed recovery already imported the repository", async () => {
      await writeRepositoryBackend(repositoryPath, destination);
      remote = state();
      const importsPath = path.join(
        repositoryPath,
        "repository-state-imports.tf",
      );
      await fs.writeFile(importsPath, repositoryRecoveryImportsHeader);
      const recover = vi.fn(async (): Promise<void> => {
        throw new Error("Remaining imports unavailable");
      });
      const input = {
        destination,
        github,
        recover,
        repositoryPath,
        run,
        storage,
      };
      await expect(prepareRepositoryState(input)).rejects.toThrow(
        "Remaining imports unavailable",
      );
      await expect(fs.readFile(importsPath, "utf8")).resolves.toBe(
        repositoryRecoveryImportsHeader,
      );
      recover.mockResolvedValueOnce(undefined);
      await expect(prepareRepositoryState(input)).resolves.toMatchObject({
        status: "remote-verified",
      });
      expect(recover).toHaveBeenCalledTimes(2);
      await expect(fs.access(importsPath)).rejects.toThrow();
    });

    it("requires the initialized backend to target the verified blob, not another Azure key", async () => {
      await writeRepositoryBackend(repositoryPath, destination);
      await fs.writeFile(
        path.join(repositoryPath, "terraform.tfstate"),
        state(),
      );
      remote = state();
      const metadataPath = path.join(
        repositoryPath,
        ".terraform",
        "terraform.tfstate",
      );
      const metadata = await fs.readFile(metadataPath, "utf8");
      await fs.writeFile(
        metadataPath,
        metadata.replace(destination.key, "another/repository.tfstate"),
      );
      await expect(prepare()).rejects.toThrow(
        "active repository backend differs",
      );
      await expect(
        fs.readFile(path.join(repositoryPath, "terraform.tfstate"), "utf8"),
      ).resolves.toBe(state());
    });
  });

  it("does not remove backups when migration lock release fails", async () => {
    await fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), state());
    const failingStorage: RepositoryStateStorage = {
      read,
      withLock: async (_destination, task) => {
        await task();
        throw new Error("Lease release failed");
      },
    };
    await expect(
      prepareRepositoryState({
        destination,
        github,
        repositoryPath,
        run,
        storage: failingStorage,
      }),
    ).rejects.toThrow("Lease release failed");
    await expect(
      fs.readFile(
        path.join(repositoryPath, "terraform.tfstate.dx-backup"),
        "utf8",
      ),
    ).resolves.toBe(state());
  });

  it("rejects malformed local state and state for another owner", async () => {
    await fs.writeFile(
      path.join(repositoryPath, "terraform.tfstate"),
      "{invalid}",
    );
    await expect(prepare()).rejects.toThrow("not valid JSON");
    await fs.writeFile(
      path.join(repositoryPath, "terraform.tfstate"),
      state().replace("pagopa/test-repo", "other/test-repo"),
    );
    await expect(prepare()).rejects.toThrow("expected repository");
    expect(commands.every((command) => command[0] === "workspace")).toBe(true);
  });

  it("rejects named workspaces before acquiring the migration lease or copying state", async () => {
    run.mockResolvedValueOnce({ stdout: "another-workspace" });
    await expect(prepare()).rejects.toThrow(
      "only the default Terraform workspace",
    );
    expect(read).not.toHaveBeenCalled();
    await expect(
      readRepositoryBackend(repositoryPath),
    ).resolves.toBeUndefined();
  });

  it("refuses to migrate hidden additional local workspaces", async () => {
    await fs.mkdir(path.join(repositoryPath, "terraform.tfstate.d", "other"), {
      recursive: true,
    });
    await expect(prepare()).rejects.toThrow(
      "only the default Terraform workspace",
    );
    expect(read).not.toHaveBeenCalled();
  });
});

describe("repository state validation", () => {
  it("does not expose malformed state contents even in verbose errors", () => {
    const failure = (() => {
      try {
        parseRepositoryState("PRIVATE_STATE_CONTENT", github);
      } catch (cause) {
        return cause;
      }
    })();
    expect(failure).toBeInstanceOf(Error);
    expect(formatErrorDetailed(failure)).not.toContain("PRIVATE_STATE_CONTENT");
    expect(formatErrorDetailed(failure)).toContain("not valid JSON");
  });
  it("rejects unsupported schema versions and missing resource identities", () => {
    expect(() =>
      parseRepositoryState(
        state().replace('"version":4', '"version":3'),
        github,
      ),
    ).toThrow("unsupported structure");
    expect(() =>
      parseRepositoryState(
        state().replace('"id":"protection-main"', '"wrong":"id"'),
        github,
      ),
    ).toThrow("without identities");
  });

  it("rejects remote state older than the local source", () => {
    expect(() =>
      verifyStateCopy(
        parseRepositoryState(state("same", 2), github),
        parseRepositoryState(state("same", 1), github),
      ),
    ).toThrow("differs from local state");
  });
});
