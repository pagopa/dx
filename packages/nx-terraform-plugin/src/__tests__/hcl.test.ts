import { DependencyType } from "@nx/devkit";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLocalModuleSourceRoots, getStaticDependencies } from "../hcl.ts";
import { ProjectFile } from "../project-file.ts";

const loggerMocks = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock("../logger.ts", () => ({
  getPackageLogger: () => ({ warn: loggerMocks.warn }),
}));

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

describe("getLocalModuleSourceRoots", () => {
  const fileName = path.join("infra", "resources", "dev", "main.tf");

  beforeEach(() => {
    loggerMocks.warn.mockClear();
  });

  it("resolves quoted and bare labels relative to the file directory", () => {
    const roots = getLocalModuleSourceRoots(
      fileName,
      `
module "quoted" {
  source = "../_modules/foo"
}

module bare {
  source = "../_modules/bar"
}
`,
    );

    expect(roots).toEqual([
      path.join("infra", "resources", "_modules", "foo"),
      path.join("infra", "resources", "_modules", "bar"),
    ]);
  });

  it("decodes static escapes and ignores interpolated or non-local sources", () => {
    const content = [
      'module "escaped" {',
      '  source = "../_modules/\\u0061\\"b\\\\"',
      "}",
      'module "dollar" {',
      '  source = "../_modules/$${x}%%{y}"',
      "}",
      'module "interpolated" {',
      '  source = "${var.dir}/_modules/foo"',
      "}",
      'module "registry" {',
      '  source = "terraform-aws-modules/vpc/aws"',
      "}",
    ].join("\n");

    const roots = getLocalModuleSourceRoots(fileName, content);

    expect(roots).toEqual([
      path.join("infra", "resources", "_modules", 'a"b\\'),
      path.join("infra", "resources", "_modules", "${x}%{y}"),
    ]);
  });

  it("drops references that leave the workspace", () => {
    const roots = getLocalModuleSourceRoots(
      path.join("main.tf"),
      `module "out" {\n  source = "../../outside"\n}\n`,
    );

    expect(roots).toEqual([]);
  });

  it("skips files whose valid Unicode heredoc the grammar cannot parse", () => {
    const roots = getLocalModuleSourceRoots(
      fileName,
      [
        "locals {",
        "  text = <<ÉOF",
        "body",
        "ÉOF",
        "}",
        "",
        'module "a" {',
        '  source = "../_modules/a"',
        "}",
        "",
      ].join("\n"),
    );

    expect(roots).toEqual([]);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.stringContaining("unsupported HCL syntax"),
      // The grammar reports the error where it recovers, after the heredoc block.
      expect.objectContaining({ fileName, line: 10 }),
    );
  });
});
