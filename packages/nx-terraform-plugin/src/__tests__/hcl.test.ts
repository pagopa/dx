import { DependencyType } from "@nx/devkit";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getLocalModuleSourceRoots, getStaticDependencies } from "../hcl.ts";
import { ProjectFile } from "../project-file.ts";

describe("getStaticDependencies", () => {
  it.each([
    [
      "attributes after an object expression",
      'module "alpha" { for_each = { dev = "dev" } source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "only direct source attributes",
      'module "alpha" { settings = { source = "../wrong" } source = "../right" }',
      ["infra/resources/right"],
    ],
    [
      "quoted braces, comments, and heredoc contents",
      'module "alpha" { note = "}" # source = "../comment"\n // source = "../line-comment"\n /* } source = "../block-comment" */\n template = <<_EOF\nmodule "fake" { source = "../heredoc" }\n_EOF\n source = "../right" }',
      ["infra/resources/right"],
    ],
    [
      "a later module source does not belong to an earlier block",
      'module "remote" { source = "terraform-aws-modules/vpc/aws" }\nmodule "local" { source = "../local" }',
      ["infra/resources/local"],
    ],
  ])("extracts local roots with %s", (_description, content, roots) => {
    expect(
      getLocalModuleSourceRoots("infra/resources/dev/main.tf", content),
    ).toEqual(roots);
  });

  it("extracts only local module source roots", () => {
    const fileContent = `
module "foo" {
  source = "../_modules/foo"
}

module "foo_again" {
  source = "../_modules/foo"
}

module "remote" {
  source = "git::https://example.com/terraform/modules.git//foo"
}
`;

    expect(
      getLocalModuleSourceRoots(
        path.join("infra", "resources", "dev", "main.tf"),
        fileContent,
      ),
    ).toEqual([path.join("infra", "resources", "_modules", "foo")]);
  });

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
