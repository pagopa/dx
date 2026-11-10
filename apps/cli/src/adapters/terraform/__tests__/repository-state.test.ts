import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ensureRemoteRepositoryState,
  type RepositoryStateDestination,
  type TerraformRunner,
} from "../repository-state.js";

const destination: RepositoryStateDestination = {
  containerName: "terraform-state",
  key: "dx/repository.tfstate",
  resourceGroupName: "rg",
  storageAccountName: "sa",
  subscriptionId: "sub",
};

const BACKEND = 'terraform {\n  backend "azurerm" {}\n}\n';
const LOCAL_STATE = JSON.stringify({ resources: [{ type: "x" }] });

describe("ensureRemoteRepositoryState", () => {
  let dir: string;
  let calls: string[][];

  const file = (name: string) => path.join(dir, name);
  const exists = (name: string) =>
    fs.access(file(name)).then(
      () => true,
      () => false,
    );

  const run = ({
    onCall,
    remote = false,
    responses = {},
  }: {
    onCall?: (args: string[]) => Promise<void>;
    remote?: boolean;
    responses?: Record<string, { exitCode: number; stdout?: string }>;
  } = {}) => {
    const terraform: TerraformRunner = async (args) => {
      calls.push(args);
      await onCall?.(args);
      const response = responses[args[0]] ?? { exitCode: 0 };
      return { exitCode: response.exitCode, stdout: response.stdout ?? "" };
    };
    return ensureRemoteRepositoryState({
      destination,
      destinationHasState: async () => remote,
      repositoryName: "repo",
      repositoryPath: dir,
      terraform,
    });
  };

  const commands = () => calls.map(([command]) => command);

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-state-"));
    calls = [];
    await fs.writeFile(file("providers.tf"), "# providers\n");
    await fs.writeFile(file("main.tf"), 'module "github_repository" {}\n');
  });

  afterEach(() => fs.rm(dir, { force: true, recursive: true }));

  it("does nothing when the backend is configured and no local state exists", async () => {
    await fs.writeFile(file("providers.tf"), BACKEND);
    await expect(run()).resolves.toBe("already-remote");
    expect(calls).toEqual([]);
  });

  it("migrates local state, verifies the plan and deletes the local files", async () => {
    await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
    await fs.writeFile(file("terraform.tfstate.backup"), "{}");
    await expect(run()).resolves.toBe("migrated");
    expect(commands()).toEqual(["init", "plan"]);
    expect(calls[0]).toContain("-force-copy");
    await expect(fs.readFile(file("providers.tf"), "utf8")).resolves.toContain(
      '"dx/repository.tfstate"',
    );
    await expect(exists("terraform.tfstate")).resolves.toBe(false);
    await expect(exists("terraform.tfstate.backup")).resolves.toBe(false);
  });

  it("retries an interrupted migration without duplicating the backend", async () => {
    await fs.writeFile(file("providers.tf"), BACKEND);
    await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
    await expect(run()).resolves.toBe("migrated");
    expect(
      (await fs.readFile(file("providers.tf"), "utf8")).match(/backend/g),
    ).toHaveLength(1);
  });

  it("refuses to overwrite a destination that already has state", async () => {
    await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
    await expect(run({ remote: true })).rejects.toThrow(
      /resolve this manually/,
    );
    expect(calls).toEqual([]);
    await expect(exists("terraform.tfstate")).resolves.toBe(true);
  });

  it("keeps the local state when the plan after the copy is not clean", async () => {
    await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
    await expect(run({ responses: { plan: { exitCode: 2 } } })).rejects.toThrow(
      /not clean/,
    );
    await expect(exists("terraform.tfstate")).resolves.toBe(true);
  });

  it("reuses state already present in the backend", async () => {
    await expect(run({ remote: true })).resolves.toBe("already-remote");
    expect(commands()).toEqual(["init", "plan"]);
  });

  it("imports existing GitHub objects when no state exists anywhere", async () => {
    let importFile = "";
    await expect(
      run({
        onCall: async (args) => {
          if (args[0] === "init") {
            importFile = await fs.readFile(file("dx-import.tf"), "utf8");
          }
        },
      }),
    ).resolves.toBe("imported");
    expect(importFile).toContain('id = "repo:main"');
    expect(importFile).toContain(
      "module.github_repository.github_repository.this",
    );
    expect(commands()).toEqual(["init", "plan", "apply"]);
    await expect(exists("dx-import.tf")).resolves.toBe(false);
  });

  it("aborts without applying when the import plan deletes or replaces objects", async () => {
    const stdout = JSON.stringify({
      change: {
        action: "replace",
        resource: { addr: "module.github_repository.github_branch.main" },
      },
      type: "planned_change",
    });
    await expect(
      run({ responses: { plan: { exitCode: 0, stdout } } }),
    ).rejects.toThrow(/destroy or replace/);
    expect(commands()).not.toContain("apply");
    await expect(exists("dx-import.tf")).resolves.toBe(false);
    await expect(fs.readFile(file("providers.tf"), "utf8")).resolves.toBe(
      "# providers\n",
    );
  });

  it("aborts the import when environments are already configured", async () => {
    await fs.writeFile(
      file("main.tf"),
      'repository = { environments = ["dev"] }',
    );
    await expect(run()).rejects.toThrow(/recover its state manually/);
    expect(calls).toEqual([]);
  });
});
