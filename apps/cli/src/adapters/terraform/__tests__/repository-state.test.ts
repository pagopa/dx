/**
 * Repository-state lifecycle through its public coordinator and real internal adapters.
 */
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { blobFaults, credential } from "../../azure/__tests__/blob-fixture.js";
import {
  recoveredState,
  recoveryPlan,
  seedRecovery,
} from "./recovery-fixture.js";
import {
  createStateFixture,
  destination,
  github,
  localState,
} from "./state-fixture.js";

vi.mock("@azure/storage-blob", async () => {
  const { BlobServiceClient } =
    await import("../../azure/__tests__/blob-fixture.js");
  return { BlobServiceClient };
});

import { AzureRepositoryStateStorage } from "../../azure/repository-state-storage.js";
import { prepareRepositoryState } from "../repository-state.js";

let fixture: Awaited<ReturnType<typeof createStateFixture>>;
const storage = new AzureRepositoryStateStorage(credential);
const prepare = () =>
  prepareRepositoryState({
    destination,
    github,
    repositoryPath: fixture.repositoryPath,
    storage,
  });

beforeEach(async () => {
  fixture = await createStateFixture();
});

afterEach(async () => {
  await fixture.dispose();
});

describe("repository-state lifecycle", () => {
  it("makes local repository state available remotely before reporting migration complete", async () => {
    await fixture.seedLocal();

    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });
    await expect(storage.read(destination)).resolves.toBe(localState);
    await expect(fs.readdir(fixture.repositoryPath)).resolves.not.toContain(
      "terraform.tfstate",
    );
    await expect(fs.readdir(fixture.repositoryPath)).resolves.not.toContain(
      "terraform.tfstate.dx-backup",
    );
    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "providers.tf"), "utf8"),
    ).resolves.toContain(
      'key                  = "dx/payments/repository.tfstate"',
    );
    const { stdout } = await execa(fixture.terraform, ["validate", "-json"], {
      cwd: fixture.repositoryPath,
    });
    expect(JSON.parse(stdout)).toMatchObject({ valid: true });
  });

  it("keeps a private recoverable copy when external migration fails", async () => {
    await fixture.seedLocal();
    await fixture.scenario({ failure: "migration" });

    await expect(prepare()).rejects.toThrow(
      "Terraform init failed during repository state preparation",
    );

    const backup = path.join(
      fixture.repositoryPath,
      "terraform.tfstate.dx-backup",
    );
    await expect(fs.readFile(backup, "utf8")).resolves.toBe(localState);
    expect((await fs.stat(backup)).mode % 0o1000).toBe(0o600);
    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("preserves local state when the transferred snapshot has a different lineage", async () => {
    await fixture.seedLocal();
    await fixture.scenario({
      migratedState: localState.replace(
        "fixture-original-lineage",
        "foreign-lineage",
      ),
    });

    await expect(prepare()).rejects.toThrow(
      "Remote repository state differs from local state",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("refuses a stale transferred snapshot instead of discarding newer local state", async () => {
    await fixture.seedLocal();
    await fixture.scenario({
      migratedState: localState.replace('"serial":7', '"serial":6'),
    });

    await expect(prepare()).rejects.toThrow(
      "Remote repository state differs from local state",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("refuses a transferred snapshot that lost an original managed resource identity", async () => {
    await fixture.seedLocal();
    await fixture.scenario({
      migratedState: localState.replace("test-repo:main", "other-protection"),
    });

    await expect(prepare()).rejects.toThrow(
      "Remote repository state differs from local state",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("does not report success when Terraform actually initialized another backend key", async () => {
    await fixture.seedLocal();
    await fixture.scenario({ activeKey: "different/repository.tfstate" });

    await expect(prepare()).rejects.toThrow(
      "active repository backend differs",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("restores an interrupted transfer's local source so the same operation can be retried", async () => {
    await fixture.seedLocal();
    await fixture.scenario({ failure: "release-source" });
    await expect(prepare()).rejects.toThrow(
      "Terraform init failed during repository state preparation",
    );
    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);

    await fixture.scenario({});
    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });
    await expect(storage.read(destination)).resolves.toBe(localState);
    await expect(fs.readdir(fixture.repositoryPath)).resolves.not.toContain(
      "terraform.tfstate.dx-backup",
    );
  });

  it("retains local recovery files until the migration lease is successfully released", async () => {
    await fixture.seedLocal();
    blobFaults.release = new Error("Lease release failed");

    await expect(prepare()).rejects.toThrow("Lease release failed");

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate.dx-backup"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });
});

describe("repository-state recovery", () => {
  it("recovers existing GitHub resources with provider-valid imports when local state is missing", async () => {
    await seedRecovery(fixture.root);

    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });

    await expect(storage.read(destination)).resolves.toBe(recoveredState);
    await expect(fs.readdir(fixture.repositoryPath)).resolves.not.toContain(
      "repository-state-imports.tf",
    );
  });

  it("resumes pending imports after partial recovery instead of accepting repository-only state", async () => {
    await seedRecovery(fixture.root);
    await fixture.scenario({ failure: "apply" });
    await expect(prepare()).rejects.toThrow(
      "Terraform apply failed during repository state preparation",
    );
    await expect(fs.readdir(fixture.repositoryPath)).resolves.toContain(
      "repository-state-imports.tf",
    );

    await fixture.scenario({});
    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });

    await expect(storage.read(destination)).resolves.toBe(recoveredState);
    await expect(fs.readdir(fixture.repositoryPath)).resolves.not.toContain(
      "repository-state-imports.tf",
    );
  });

  it("refuses a recovery plan that would delete an existing GitHub resource", async () => {
    await seedRecovery(fixture.root);
    await fs.writeFile(
      path.join(fixture.root, "recovery-plan.json"),
      JSON.stringify({
        resource_changes: [
          ...recoveryPlan.resource_changes,
          {
            address: "module.github_repository.github_branch.obsolete",
            change: { actions: ["delete"], after: null },
            mode: "managed",
            type: "github_branch",
          },
        ],
      }),
    );

    await expect(prepare()).rejects.toThrow(
      "would destroy or replace resources",
    );

    await expect(storage.read(destination)).resolves.toBeUndefined();
  });

  it("refuses recovery rather than silently skipping an unsupported GitHub resource", async () => {
    await seedRecovery(fixture.root);
    await fs.writeFile(
      path.join(fixture.root, "recovery-plan.json"),
      JSON.stringify({
        resource_changes: [
          ...recoveryPlan.resource_changes,
          {
            address:
              "module.github_repository.github_repository_collaborator.member",
            change: {
              actions: ["create"],
              after: { username: "fixture-user" },
            },
            mode: "managed",
            type: "github_repository_collaborator",
          },
        ],
      }),
    );

    await expect(prepare()).rejects.toThrow(
      "Automatic repository recovery does not support module.github_repository.github_repository_collaborator.member",
    );

    await expect(storage.read(destination)).resolves.toBeUndefined();
  });
});

describe("repository-state safety and retries", () => {
  it("does not expose malformed local-state contents through the returned error or its causes", async () => {
    await fixture.seedLocal("secret-token");

    const outcome = await prepare().then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );

    expect(outcome).toMatchObject({
      error: {
        message: expect.stringContaining(
          "Repository Terraform state is not valid JSON",
        ),
      },
    });
    expect(inspect(outcome, { depth: null })).not.toContain("secret-token");
    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe("secret-token");
  });

  it("refuses migration from a non-default Terraform workspace before writing a backend", async () => {
    await fixture.seedLocal();
    await fixture.scenario({ workspace: "review" });

    await expect(prepare()).rejects.toThrow(
      "supports only the default Terraform workspace",
    );

    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "providers.tf"), "utf8"),
    ).resolves.toBe("terraform {\n}\n");
    await expect(storage.read(destination)).resolves.toBeUndefined();
  });

  it("refuses migration of other local workspaces even when default is selected", async () => {
    await fixture.seedLocal();
    await fs.mkdir(
      path.join(fixture.repositoryPath, "terraform.tfstate.d", "review"),
      {
        recursive: true,
      },
    );

    await expect(prepare()).rejects.toThrow(
      "supports only the default Terraform workspace",
    );

    await expect(
      fs.readFile(path.join(fixture.repositoryPath, "providers.tf"), "utf8"),
    ).resolves.toBe("terraform {\n}\n");
    await expect(storage.read(destination)).resolves.toBeUndefined();
  });

  it("refuses to move a local snapshot belonging to another GitHub repository", async () => {
    const foreign = localState.replaceAll("test-repo", "another-repo");
    await fixture.seedLocal(foreign);

    await expect(prepare()).rejects.toThrow(
      "does not manage the expected repository pagopa/test-repo",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(foreign);
    await expect(storage.read(destination)).resolves.toBeUndefined();
  });

  it("keeps recovery files when Terraform cannot read the snapshot verified in Azure", async () => {
    await fixture.seedLocal();
    await fixture.scenario({
      pulledState: localState.replace(
        "fixture-original-lineage",
        "different-readable-lineage",
      ),
    });

    await expect(prepare()).rejects.toThrow(
      "Remote repository state differs from local state",
    );

    await expect(
      fs.readFile(
        path.join(fixture.repositoryPath, "terraform.tfstate"),
        "utf8",
      ),
    ).resolves.toBe(localState);
  });

  it("preserves a conflicting migration backup instead of overwriting it", async () => {
    await fixture.seedLocal();
    const backup = localState.replace(
      "fixture-original-lineage",
      "earlier-backup-lineage",
    );
    const filename = path.join(
      fixture.repositoryPath,
      "terraform.tfstate.dx-backup",
    );
    await fs.writeFile(filename, backup, { mode: 0o600 });

    await expect(prepare()).rejects.toThrow(
      "migration backup conflicts with the current local state",
    );

    await expect(fs.readFile(filename, "utf8")).resolves.toBe(backup);
    await expect(storage.read(destination)).resolves.toBeUndefined();
  });

  it("recovers an empty initialized Azure state blob instead of treating it as corrupt repository state", async () => {
    await fixture.configureBackend();
    await fixture.putRemote("");
    await seedRecovery(fixture.root);

    await expect(prepare()).resolves.toEqual({
      destination,
      status: "remote-verified",
    });

    await expect(storage.read(destination)).resolves.toBe(recoveredState);
  });

  it("refuses a backend changed after confirmation without transferring to the new destination", async () => {
    await fixture.configureBackend();
    const providers = path.join(fixture.repositoryPath, "providers.tf");
    const changed = (await fs.readFile(providers, "utf8")).replace(
      "dx/payments/repository.tfstate",
      "other/repository.tfstate",
    );
    await fs.writeFile(providers, changed);
    await fixture.seedLocal();

    await expect(prepare()).rejects.toThrow(
      "backend changed after confirmation",
    );

    await expect(
      storage.read({ ...destination, key: "other/repository.tfstate" }),
    ).resolves.toBeUndefined();
    await expect(fs.readFile(providers, "utf8")).resolves.toBe(changed);
  });
});
