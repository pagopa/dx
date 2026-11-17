import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RepositoryStateDestination } from "../repository-backend.js";

import {
  ensureRemoteRepositoryState,
  type TerraformRunner,
} from "../repository-state.js";

const destination: RepositoryStateDestination = {
  containerName: "terraform-state",
  key: "dx/repository.tfstate",
  resourceGroupName: "rg",
  storageAccountName: "sa",
  subscriptionId: "sub",
};

const BACKEND = `terraform {
  backend "azurerm" {
    resource_group_name = "rg"
    storage_account_name = "sa"
    subscription_id = "sub"
    container_name = "terraform-state"
    key = "dx/repository.tfstate"
  }
}\n`;
const LOCAL_STATE = JSON.stringify({
  resources: [
    ["github_repository", "this"],
    ["github_repository_vulnerability_alerts", "repository"],
    ["github_branch", "main"],
    ["github_branch_default", "main"],
    ["github_branch_protection", "main"],
    ["github_actions_repository_permissions", "repo"],
  ].map(([type, name]) => ({
    instances: [{ attributes: { id: "repo", name: "repo" } }],
    mode: "managed",
    module: "module.github_repository",
    name,
    type,
  })),
});

const PLAN_SUMMARY = JSON.stringify({ type: "change_summary" });

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
    return {
      exitCode: response.exitCode,
      stdout: response.stdout ?? PLAN_SUMMARY,
    };
  };
  return ensureRemoteRepositoryState({
    destination,
    destinationExists: async () => remote,
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

describe("repository state migration and reuse", () => {
  it("verifies the configured backend before accepting it as already remote", async () => {
    await fs.writeFile(file("providers.tf"), BACKEND);
    await expect(run()).resolves.toBe("already-remote");
    expect(commands()).toEqual(["init", "plan"]);
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

  it.each([
    { resources: [{ type: "unrelated" }] },
    { resources: JSON.parse(LOCAL_STATE).resources.slice(0, 1) },
  ])(
    "rejects unrelated or incomplete local state before copying",
    async (state) => {
      await fs.writeFile(file("terraform.tfstate"), JSON.stringify(state));

      await expect(run()).rejects.toThrow(/expected repository resources/);

      expect(calls).toEqual([]);
      await expect(fs.readFile(file("providers.tf"), "utf8")).resolves.toBe(
        "# providers\n",
      );
      await expect(
        fs.readFile(file("terraform.tfstate"), "utf8"),
      ).resolves.toBe(JSON.stringify(state));
    },
  );

  it("keeps the local state when the plan after the copy is not clean", async () => {
    await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
    await expect(run({ responses: { plan: { exitCode: 2 } } })).rejects.toThrow(
      /not clean/,
    );
    await expect(exists("terraform.tfstate")).resolves.toBe(true);
  });

  it.each([
    { local: true, scenario: "migration" },
    { local: false, scenario: "remote-state reuse" },
  ])(
    "keeps blocking retries after failed verification during $scenario",
    async ({ local }) => {
      if (local) {
        await fs.writeFile(file("terraform.tfstate"), LOCAL_STATE);
      }

      await expect(
        run({
          onCall: async (args) => {
            if (args.includes("-migrate-state")) {
              await fs.writeFile(file("terraform.tfstate.backup"), LOCAL_STATE);
              await fs.writeFile(
                file("terraform.tfstate"),
                JSON.stringify({ resources: [] }),
              );
            }
          },
          remote: !local,
          responses: { plan: { exitCode: 2 } },
        }),
      ).rejects.toThrow(/not clean/);

      for (const exitCode of [2, 1]) {
        calls = [];
        await expect(
          run({ remote: true, responses: { plan: { exitCode } } }),
        ).rejects.toThrow(/not clean/);
        expect(commands()).toEqual(["init", "plan"]);
      }
      await expect(exists("terraform.tfstate.backup")).resolves.toBe(local);

      calls = [];
      await expect(run({ remote: true })).resolves.toBe("already-remote");
      expect(commands()).toEqual(["init", "plan"]);
      await expect(exists("terraform.tfstate.backup")).resolves.toBe(false);
    },
  );

  it("reuses state already present in the backend", async () => {
    await expect(run({ remote: true })).resolves.toBe("already-remote");
    expect(commands()).toEqual(["init", "plan"]);
  });
});

describe("repository state import", () => {
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
    expect(calls[1]).toContain(`-out=${calls[2][2]}`);
    expect(calls[2]).not.toContain("-auto-approve");
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

  it.each([
    "{broken",
    JSON.stringify({ change: { action: "delete" }, type: "planned_change" }),
    JSON.stringify({
      change: { action: "unsupported", resource: { addr: "repository" } },
      type: "planned_change",
    }),
    "",
  ])(
    "rejects uninspectable import plan output without applying",
    async (stdout) => {
      await expect(
        run({ responses: { plan: { exitCode: 0, stdout } } }),
      ).rejects.toThrow(/import plan/);
      expect(commands()).not.toContain("apply");
    },
  );

  it("accepts valid unrelated Terraform events while inspecting changes", async () => {
    const stdout = [
      JSON.stringify({ terraform: "1.14.0", type: "version" }),
      "",
      JSON.stringify({
        change: {
          action: "import",
          resource: { addr: "module.github_repository.github_repository.this" },
        },
        type: "planned_change",
      }),
      PLAN_SUMMARY,
    ].join("\n");

    await expect(
      run({ responses: { plan: { exitCode: 0, stdout } } }),
    ).resolves.toBe("imported");
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
