/**
 * Exercises repository synchronization with the real Terraform HCL validator.
 * Remote Terraform initialization and apply are stubbed to keep tests offline.
 */
import { execa, ExecaError } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Payload } from "../../generators/environment/prompts.js";

import { syncRepositoryEnvironments } from "../sync-repository-environments.js";

const terraformCommand = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../../execa/terraform.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../execa/terraform.js")>()),
  tf$: vi.fn(() => terraformCommand),
}));

const payload: Payload = {
  env: {
    cloudAccounts: [
      {
        csp: "azure",
        defaultLocation: "italynorth",
        displayName: "DEV-DX",
        id: "test-subscription",
      },
    ],
    name: "dev",
    prefix: "dx",
  },
  github: { owner: "pagopa", repo: "my-project" },
  tags: {
    CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
    Owner: "DX Platform",
  },
  workspace: { domain: "payments" },
};

const inTemporaryRepository = async (
  content: string,
  check: (mainFile: string, repositoryDirectory: string) => Promise<void>,
): Promise<void> => {
  const cwd = process.cwd();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-hcl-real-"));
  const repositoryDirectory = path.join(directory, "infra", "repository");
  try {
    await fs.mkdir(repositoryDirectory, { recursive: true });
    const mainFile = path.join(repositoryDirectory, "main.tf");
    await fs.writeFile(mainFile, content);
    process.chdir(directory);
    await check(mainFile, repositoryDirectory);
  } finally {
    process.chdir(cwd);
    await fs.rm(directory, { force: true, recursive: true });
  }
};

describe("repository synchronization with real Terraform validation", () => {
  let terraformInstalled = false;

  beforeAll(async () => {
    try {
      await execa("terraform", ["version"]);
      terraformInstalled = true;
    } catch (cause) {
      if (
        !(cause instanceof ExecaError) ||
        cause.code !== "ENOENT" ||
        process.env.CI
      ) {
        throw cause;
      }
    }
  });

  beforeEach((context) => {
    if (!terraformInstalled) {
      context.skip("Terraform CLI is not installed");
    }
    terraformCommand.mockClear();
  });

  it("writes a valid candidate without applying Terraform formatting to unrelated source", async () => {
    const content = [
      "locals {",
      '  description    =      "keep this formatting"',
      "}",
      'module "github_repository" {',
      "  repository = {",
      '    name = "my-project"',
      "  }",
      "}",
      "",
    ].join("\n");
    const expected = [
      "locals {",
      '  description    =      "keep this formatting"',
      "}",
      'module "github_repository" {',
      "  repository = {",
      '    name = "my-project"',
      '    environments           = ["dev", "prod"]',
      "  }",
      "}",
      "",
    ].join("\n");

    await inTemporaryRepository(content, async (mainFile, directory) => {
      await syncRepositoryEnvironments(payload);

      await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(expected);
      await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
      expect(terraformCommand).toHaveBeenCalledTimes(2);
    });
  });

  it("preserves the file and reports Terraform diagnostics when validation fails", async () => {
    const content = [
      'module "github_repository" {',
      '  repository = { name = "my-project" topics = [] }',
      "}",
      "",
    ].join("\n");

    await inTemporaryRepository(content, async (mainFile, directory) => {
      await expect(syncRepositoryEnvironments(payload)).rejects.toThrow(
        /Missing attribute separator[\s\S]*line 2/,
      );
      await expect(fs.readFile(mainFile, "utf8")).resolves.toBe(content);
      await expect(fs.readdir(directory)).resolves.toEqual(["main.tf"]);
      expect(terraformCommand).not.toHaveBeenCalled();
    });
  });
});
