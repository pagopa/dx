/**
 * Real filesystem/subprocess harness; only Azure and executable tool boundaries are simulated.
 * Requires `mise which terraform` for real HCL validation, but never installs providers
 * or contacts cloud APIs. State transfer/apply are external protocol fixtures;
 * recovery IDs are checked against an independent provider-contract fixture.
 */
import { execa } from "execa";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { z } from "zod/v4";

import {
  blobFaults,
  blobs,
  destination,
} from "../../azure/__tests__/blob-fixture.js";

export const localState = JSON.stringify({
  lineage: "fixture-original-lineage",
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
      instances: [{ attributes: { id: "test-repo:main" } }],
      mode: "managed",
      module: "module.github_repository",
      name: "main",
      type: "github_branch_protection",
    },
  ],
  serial: 7,
  version: 4,
});

export const backendConfiguration = `terraform {
  backend "azurerm" {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    subscription_id      = "subscription-dev"
    container_name       = "terraform-state"
    key                  = "dx/payments/repository.tfstate"
    use_azuread_auth     = true
  }
}
`;

export type ToolScenario = {
  activeKey?: string;
  failure?: "apply" | "migration" | "release-source";
  migratedState?: string;
  pulledState?: string;
  workspace?: string;
};

export const createStateFixture = async () => {
  const { stdout: terraform } = await execa("mise", ["which", "terraform"]);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dx-state-contract-"));
  const repositoryPath = path.join(root, "infra", "repository");
  const remote = path.join(
    root,
    "blobs",
    "dxditntfstatest01.blob.core.windows.net",
    "terraform-state",
    "dx",
    "payments",
    "repository.tfstate",
  );
  const control = path.join(root, "control.json");
  const scenarioPath = path.join(root, "scenario.json");
  const bin = path.join(root, "bin");
  await fs.mkdir(repositoryPath, { recursive: true });
  await fs.mkdir(bin);
  const executable = path.join(bin, "tool-fixture.mjs");
  await fs.copyFile(
    fileURLToPath(new URL("./tool-fixture.mjs", import.meta.url)),
    executable,
  );
  await fs.chmod(executable, 0o755);
  await fs.mkdir(path.join(bin, "node_modules"));
  await fs.symlink(
    path.dirname(createRequire(import.meta.url).resolve("zod/package.json")),
    path.join(bin, "node_modules", "zod"),
  );
  await fs.symlink(process.execPath, path.join(bin, "node"));
  for (const name of ["terraform", "mise", "az", "git", "gh"]) {
    await fs.symlink(executable, path.join(bin, name));
  }
  await fs.writeFile(
    path.join(repositoryPath, "providers.tf"),
    "terraform {\n}\n",
  );
  await fs.writeFile(
    control,
    JSON.stringify({ remote, root, terraform: terraform.trim() }),
  );
  await fs.writeFile(scenarioPath, "{}");
  await fs.writeFile(path.join(root, "known-repository.tfstate"), localState);
  blobs.root = path.join(root, "blobs");
  blobs.leases.clear();
  delete blobFaults.release;
  delete blobFaults.container;
  delete blobFaults.renewal;
  delete blobFaults.renewalHangs;
  vi.stubEnv("PATH", `${bin}:/usr/bin:/bin`);
  vi.stubEnv("DX_TEST_CONTROL", control);
  return {
    configureBackend: () =>
      fs.writeFile(
        path.join(repositoryPath, "providers.tf"),
        backendConfiguration,
      ),
    dispose: async () => {
      vi.unstubAllEnvs();
      const content = await fs
        .readFile(path.join(root, "child-pid"), "utf8")
        .catch((cause: unknown) => {
          if (
            cause instanceof Error &&
            "code" in cause &&
            cause.code === "ENOENT"
          ) {
            return undefined;
          }
          throw cause;
        });
      if (content !== undefined) {
        const pid = z.number().int().positive().parse(JSON.parse(content));
        try {
          process.kill(pid, "SIGTERM");
        } catch (cause) {
          if (
            !(
              cause instanceof Error &&
              "code" in cause &&
              cause.code === "ESRCH"
            )
          ) {
            throw cause;
          }
        }
        let exited = false;
        for (let attempt = 0; attempt < 200; attempt++) {
          try {
            process.kill(pid, 0);
          } catch (cause) {
            if (
              !(
                cause instanceof Error &&
                "code" in cause &&
                cause.code === "ESRCH"
              )
            ) {
              throw cause;
            }
            exited = true;
            break;
          }
          await sleep(10);
        }
        if (!exited) {
          throw new Error(
            `Fixture child ${pid} did not exit; retaining ${root} for investigation.`,
          );
        }
      }
      await fs.rm(root, { recursive: true });
    },
    putRemote: async (content: string) => {
      await fs.mkdir(path.dirname(remote), { recursive: true });
      await fs.writeFile(remote, content);
    },
    repositoryPath,
    root,
    scenario: (scenario: ToolScenario) =>
      fs.writeFile(scenarioPath, JSON.stringify(scenario)),
    seedLocal: (content = localState) =>
      fs.writeFile(path.join(repositoryPath, "terraform.tfstate"), content),
    terraform: terraform.trim(),
  };
};

export const github = { owner: "pagopa", repo: "test-repo" };
export { destination };
