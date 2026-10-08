import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import { getSharedModuleDirectories } from "../terraform-modules.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-tf-modules-integration-"),
  );
  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });
  return workspaceRoot;
};

const writeFile = async (filePath: string, content = "") => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};

const hasTerraform = await execa("terraform", ["version"]).then(
  () => true,
  () => false,
);

describe.runIf(hasTerraform)(
  "getSharedModuleDirectories with the real Terraform CLI",
  () => {
    const providersBlock = `
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
  backend "s3" {
    bucket = "synthetic-bucket"
    key    = "synthetic/state"
    region = "eu-south-1"
  }
}
`;

    const writeFixture = async (workspaceRoot: string) => {
      await writeFile(
        path.join(workspaceRoot, "infra/resources/dev/main.tf"),
        `${providersBlock}
module "alpha" {
  source = "../../_modules/alpha"
}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/_modules/alpha/main.tf"),
        `module "beta" {
  source = "../beta"
}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/_modules/beta/main.tf"),
        `resource "null_resource" "beta" {}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/_modules/gamma/main.tf"),
        `resource "null_resource" "gamma" {}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/resources/staging/main.tf"),
        `${providersBlock}
module "beta" {
  source = "../../_modules/beta"
}
`,
      );
    };

    it("resolves transitive modules without initializing the project", async () => {
      const workspaceRoot = await createWorkspaceRoot();
      await writeFixture(workspaceRoot);
      const projectRoot = path.join("infra", "resources", "dev");

      const result = await getSharedModuleDirectories(
        workspaceRoot,
        projectRoot,
      );

      expect(result).toEqual(["infra/_modules/alpha", "infra/_modules/beta"]);
      await expect(
        fs.access(path.join(workspaceRoot, projectRoot, ".terraform")),
      ).rejects.toThrow();
    });

    it("isolates environments with independent module references", async () => {
      const workspaceRoot = await createWorkspaceRoot();
      await writeFixture(workspaceRoot);

      const staging = await getSharedModuleDirectories(
        workspaceRoot,
        path.join("infra", "resources", "staging"),
      );

      expect(staging).toEqual(["infra/_modules/beta"]);
    });

    it("follows a changed module source without stale cached results", async () => {
      const workspaceRoot = await createWorkspaceRoot();
      await writeFixture(workspaceRoot);
      const projectRoot = path.join("infra", "resources", "dev");
      const first = await getSharedModuleDirectories(
        workspaceRoot,
        projectRoot,
      );
      expect(first).toEqual(["infra/_modules/alpha", "infra/_modules/beta"]);

      await writeFile(
        path.join(workspaceRoot, projectRoot, "main.tf"),
        `${providersBlock}
module "alpha" {
  source = "../../_modules/gamma"
}
`,
      );

      const second = await getSharedModuleDirectories(
        workspaceRoot,
        projectRoot,
      );

      expect(second).toEqual(["infra/_modules/gamma"]);
    });

    it("keeps same-labelled nested modules with different parent sources", async () => {
      const workspaceRoot = await createWorkspaceRoot();
      await writeFixture(workspaceRoot);
      await writeFile(
        path.join(workspaceRoot, "infra/resources/dev/main.tf"),
        `${providersBlock}
module "alpha" {
  source = "../../_modules/alpha"
}

module "nested" {
  source = "../../_modules/nested"
}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/_modules/nested/main.tf"),
        `module "beta" {
  source = "../nested/beta"
}
`,
      );
      await writeFile(
        path.join(workspaceRoot, "infra/_modules/nested/beta/main.tf"),
        `resource "null_resource" "nested_beta" {}
`,
      );

      const result = await getSharedModuleDirectories(
        workspaceRoot,
        path.join("infra", "resources", "dev"),
      );

      expect(result).toEqual([
        "infra/_modules/alpha",
        "infra/_modules/beta",
        "infra/_modules/nested",
        "infra/_modules/nested/beta",
      ]);
    });
  },
);
