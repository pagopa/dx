import { DependencyType } from "@nx/devkit";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getStaticDependencies } from "../hcl.ts";
import { ProjectFile } from "../project.ts";

describe("getStaticDependencies", () => {
  it("extracts a dependency from a relative module source", () => {
    const file: ProjectFile = {
      fileName: path.join("infra", "resources", "dev", "main.tf"),
      project: "resources-dev",
    };

    const fileContent = `
module "foo" {
  source = "../_modules/foo"
}
`;

    const dependencies = getStaticDependencies(file, fileContent);

    expect(dependencies).toEqual([
      {
        source: "resources-dev",
        sourceFile: path.join("infra", "resources", "dev", "main.tf"),
        target: "resources-modules-foo",
        type: DependencyType.static,
      },
    ]);
  });

  it("extracts dependencies from multiple module blocks", () => {
    const file: ProjectFile = {
      fileName: path.join("infra", "resources", "dev", "main.tf"),
      project: "resources-dev",
    };

    const fileContent = `
module "network" {
  source = "../_modules/network"
}

module "storage" {
  source = "../_modules/storage"
}
`;

    const dependencies = getStaticDependencies(file, fileContent);

    expect(dependencies).toEqual([
      {
        source: "resources-dev",
        sourceFile: path.join("infra", "resources", "dev", "main.tf"),
        target: "resources-modules-network",
        type: DependencyType.static,
      },
      {
        source: "resources-dev",
        sourceFile: path.join("infra", "resources", "dev", "main.tf"),
        target: "resources-modules-storage",
        type: DependencyType.static,
      },
    ]);
  });

  it("ignores non-relative module sources", () => {
    const file: ProjectFile = {
      fileName: path.join("infra", "resources", "dev", "main.tf"),
      project: "resources-dev",
    };

    const fileContent = `
module "registry" {
  source = "terraform-aws-modules/vpc/aws"
}

module "git" {
  source = "git::https://example.com/terraform/modules.git//vpc"
}
`;

    const dependencies = getStaticDependencies(file, fileContent);

    expect(dependencies).toEqual([]);
  });
});
