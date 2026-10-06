import { DependencyType } from "@nx/devkit";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getLocalModuleSourceRoots, getStaticDependencies } from "../hcl.ts";
import { ProjectFile } from "../project-file.ts";

describe("getStaticDependencies", () => {
  it.each([
    [
      "attributes after an object expression",
      'module "alpha" {\n for_each = { dev = "dev" }\n source = "../alpha"\n}',
      ["infra/resources/alpha"],
    ],
    [
      "only direct source attributes",
      'module "alpha" {\n settings = { source = "../wrong" }\n source = "../right"\n}',
      ["infra/resources/right"],
    ],
    [
      "quoted braces, comments, and heredoc contents",
      'module "alpha" {\n note = "}" # source = "../comment"\n // source = "../line-comment"\n /* } source = "../block-comment" */\n template = <<_EOF\nmodule "fake" { source = "../heredoc" }\n_EOF\n source = "../right"\n}',
      ["infra/resources/right"],
    ],
    [
      "a later module source does not belong to an earlier block",
      'module "remote" { source = "terraform-aws-modules/vpc/aws" }\nmodule "local" { source = "../local" }',
      ["infra/resources/local"],
    ],
    [
      "hyphenated heredocs",
      'module "alpha" {\n note = <<EOF-TEXT\n}\nmodule "fake" { source = "../fake" }\nEOF-TEXT\n source = "../alpha"\n}\nmodule "beta" { source = "../beta" }',
      ["infra/resources/alpha", "infra/resources/beta"],
    ],
    [
      "Unicode indented CRLF heredocs",
      'module "alpha" {\r\n note = <<-ÉND_1\r\n  }\r\n ÉND_1\r\n source = "../alpha"\r\n}',
      ["infra/resources/alpha"],
    ],
    [
      "nested quoted interpolation strings",
      'locals { text = "${replace("}", "}", "")}" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "nested template interpolation strings",
      'locals { text = "${replace("${format("%s", "}")}", "}", "")}" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "quoted directive expressions",
      'locals { text = "%{ if replace("}", "}", "") == "" }yes%{ endif }" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "escaped template introducers",
      'locals { text = "$${module.fake} %%{ if true } }" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "braces and comments in interpolation expressions",
      'locals { text = "${jsonencode({ value = "}" /* } */ })}" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "heredocs inside interpolation expressions",
      'locals { text = "${replace(<<EOF\n}\nEOF\n, "}", "")}" }\nmodule "alpha" { source = "../alpha" }',
      ["infra/resources/alpha"],
    ],
    [
      "same-delimiter heredocs nested in a heredoc interpolation",
      'locals {\n text = <<EOF\n${trimspace(<<EOF\n}\nEOF\n)}\nEOF\n}\nmodule "actual" { source = "../_modules/actual" }',
      ["infra/resources/_modules/actual"],
    ],
    [
      "heredoc delimiters after a multiline interpolation",
      'locals {\n text = <<EOF\n${jsonencode({\n value = "}"\n})}EOF\n}\nEOF\n}\nmodule "actual" { source = "../_modules/actual" }',
      ["infra/resources/_modules/actual"],
    ],
    [
      "unquoted module labels",
      'module actual { source = "../_modules/actual" }',
      ["infra/resources/_modules/actual"],
    ],
    [
      "Unicode escapes in source paths",
      'module actual { source = "../_modules/\\u0061ctual" }\nmodule other { source = "../_modules/\\U00000061ctual" }',
      ["infra/resources/_modules/actual"],
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
