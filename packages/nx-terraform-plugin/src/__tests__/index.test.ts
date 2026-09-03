import { DependencyType } from "@nx/devkit";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

const logtapeMocks = vi.hoisted(() => ({
  configure: vi.fn(async () => {}),
  getConsoleSink: vi.fn(() => "console-sink"),
  getJsonLinesFormatter: vi.fn(() => "json-lines-formatter"),
  getLogger: vi.fn(() => ({
    warn: logtapeMocks.warn,
  })),
  getPackageLogger: vi.fn(() => ({
    warn: logtapeMocks.warn,
  })),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@logtape/logtape", () => ({
  configure: logtapeMocks.configure,
  getConsoleSink: logtapeMocks.getConsoleSink,
  getJsonLinesFormatter: logtapeMocks.getJsonLinesFormatter,
  getLogger: logtapeMocks.getLogger,
}));

import {
  createDependencies,
  createNodesV2,
  getDiscoveryState,
  getDiscoveryStateWithValidation,
  getPublishableManifestByRoot,
} from "../index.ts";
import { parseOptions } from "../options.ts";

describe("createNodesV2", () => {
  it("discovers terraform, module manifests, and supported test files", () => {
    expect(createNodesV2[0]).toBe(
      "**/{*.tf,module.json,tests/*.tftest.hcl,tests/*_test.go}",
    );
  });
});

describe("getDiscoveryState", () => {
  it("skips only Terraform roots inside _modules", () => {
    const topLevelRoot = path.join("infra", "modules", "aws_core_infra");
    const nestedRoot = path.join(topLevelRoot, "_modules", "vpc_endpoints");
    const nestedRootOutsideModules = path.join(topLevelRoot, "nested");
    const independentRoot = path.join("infra", "resources", "prod");

    const result = getDiscoveryState([
      path.join(topLevelRoot, "main.tf"),
      path.join(topLevelRoot, "module.json"),
      path.join(topLevelRoot, "tests", "unit.tftest.hcl"),
      path.join(nestedRoot, "main.tf"),
      path.join(nestedRoot, "module.json"),
      path.join(nestedRoot, "tests", "unit.tftest.hcl"),
      path.join(nestedRootOutsideModules, "main.tf"),
      path.join(nestedRootOutsideModules, "module.json"),
      path.join(nestedRootOutsideModules, "tests", "unit.tftest.hcl"),
      path.join(independentRoot, "main.tf"),
      path.join(independentRoot, "module.json"),
    ]);

    expect(result.terraformConfigFiles).toEqual([
      path.join(topLevelRoot, "main.tf"),
      path.join(nestedRootOutsideModules, "main.tf"),
      path.join(independentRoot, "main.tf"),
    ]);
    expect(Array.from(result.moduleManifestRoots)).toEqual([
      topLevelRoot,
      nestedRootOutsideModules,
      independentRoot,
    ]);
    expect(result.testCapabilitiesByRoot.get(topLevelRoot)).toEqual({
      contract: false,
      e2e: false,
      integration: false,
      unit: true,
    });
    expect(result.testCapabilitiesByRoot.has(nestedRoot)).toBe(false);
    expect(result.testCapabilitiesByRoot.get(nestedRootOutsideModules)).toEqual(
      {
        contract: false,
        e2e: false,
        integration: false,
        unit: true,
      },
    );
  });
});

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-tf-plugin-"),
  );
  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });
  return workspaceRoot;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("createDependencies", () => {
  it("resolves nested module references to the owning Terraform project", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const moduleRoot = path.join("infra", "modules", "aws_core_infra");
    const resourceRoot = path.join("infra", "resources", "prod");
    const moduleFile = path.join(workspaceRoot, moduleRoot, "main.tf");
    const resourceFile = path.join(workspaceRoot, resourceRoot, "main.tf");

    await fs.mkdir(path.dirname(moduleFile), { recursive: true });
    await fs.mkdir(path.dirname(resourceFile), { recursive: true });
    await fs.writeFile(
      moduleFile,
      `
module "vpc_endpoints" {
  source = "./_modules/vpc_endpoints"
}
`,
      "utf-8",
    );
    await fs.writeFile(
      resourceFile,
      `
module "core_infra" {
  source = "../../modules/aws_core_infra/_modules/vpc_endpoints"
}
`,
      "utf-8",
    );

    const projectFileMap = {
      "modules-aws-core-infra": [{ file: moduleFile, hash: "" }],
      "resources-prod": [{ file: resourceFile, hash: "" }],
    };
    const result = await createDependencies(undefined, {
      externalNodes: {},
      fileMap: {
        nonProjectFiles: [],
        projectFileMap,
      },
      filesToProcess: {
        nonProjectFiles: [],
        projectFileMap,
      },
      nxJsonConfiguration: {},
      projects: {
        "modules-aws-core-infra": {
          root: moduleRoot,
          tags: ["terraform"],
        },
        "resources-prod": {
          root: resourceRoot,
          tags: ["terraform"],
        },
      },
      workspaceRoot,
    });

    expect(result).toEqual([
      {
        source: "resources-prod",
        sourceFile: resourceFile,
        target: "modules-aws-core-infra",
        type: DependencyType.static,
      },
    ]);
  });
});

describe("getPublishableManifestByRoot", () => {
  it("supports absolute manifest roots", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const moduleRoot = path.join(workspaceRoot, "infra", "modules", "module");
    await fs.mkdir(moduleRoot, { recursive: true });
    await fs.writeFile(
      path.join(moduleRoot, "module.json"),
      JSON.stringify({
        description: "Terraform module",
        provider: "aws",
        version: "1.2.3",
      }),
      "utf-8",
    );

    const result = await getPublishableManifestByRoot(
      [moduleRoot],
      workspaceRoot,
    );

    expect(result.get(moduleRoot)).toEqual({
      description: "Terraform module",
      provider: "aws",
      version: "1.2.3",
    });
  });
});

describe("getDiscoveryStateWithValidation", () => {
  it("collects test capabilities and only validated publishable roots", async () => {
    const workspaceRoot = await createWorkspaceRoot();

    const configFiles = [
      path.join("infra", "modules", "good-module", "main.tf"),
      path.join("infra", "modules", "good-module", "module.json"),
      path.join("infra", "modules", "good-module", "tests", "unit.tftest.hcl"),
      path.join(
        "infra",
        "modules",
        "good-module",
        "tests",
        "integration.tftest.hcl",
      ),
      path.join("infra", "modules", "good-module", "tests", "e2e_test.go"),
      path.join("infra", "modules", "good-module", "variables.tf"),
      path.join("infra", "modules", "invalid-module", "module.json"),
      path.join("infra", "modules", "invalid-module-two", "module.json"),
      path.join("infra", "modules", "example", "module.json"),
      path.join("infra", "modules", "tests", "main.tf"),
      path.join("infra", "resources", "prod", "main.tf"),
      path.join("packages", "web", "tests", "e2e_test.go"),
    ];

    await fs.mkdir(
      path.join(workspaceRoot, "infra", "modules", "good-module"),
      { recursive: true },
    );
    await fs.mkdir(
      path.join(workspaceRoot, "infra", "modules", "invalid-module"),
      { recursive: true },
    );
    await fs.mkdir(
      path.join(workspaceRoot, "infra", "modules", "invalid-module-two"),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "modules",
        "good-module",
        "module.json",
      ),
      JSON.stringify({
        description: "Terraform module description",
        provider: "aws",
        version: "1.2.3",
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "modules",
        "invalid-module-two",
        "module.json",
      ),
      JSON.stringify({
        description: "Terraform module without version",
        provider: "aws",
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "modules",
        "invalid-module",
        "module.json",
      ),
      JSON.stringify({
        description: "Terraform module without provider",
        version: "1.2.3",
      }),
      "utf-8",
    );

    const result = await getDiscoveryStateWithValidation(
      configFiles,
      workspaceRoot,
    );

    expect(result.terraformConfigFiles).toEqual([
      path.join("infra", "modules", "good-module", "main.tf"),
      path.join("infra", "modules", "good-module", "variables.tf"),
      path.join("infra", "resources", "prod", "main.tf"),
    ]);
    expect(Array.from(result.publishableManifestByRoot.keys())).toEqual([
      path.join("infra", "modules", "good-module"),
    ]);
    expect(
      result.testCapabilitiesByRoot.get(
        path.join("infra", "modules", "good-module"),
      ),
    ).toEqual({
      contract: false,
      e2e: true,
      integration: true,
      unit: true,
    });
    expect(
      result.testCapabilitiesByRoot.has(path.join("packages", "web")),
    ).toBe(false);
    expect(
      result.publishableManifestByRoot.get(
        path.join("infra", "modules", "good-module"),
      ),
    ).toEqual({
      description: "Terraform module description",
      provider: "aws",
      version: "1.2.3",
    });
    expect(logtapeMocks.getLogger).toHaveBeenCalledWith([
      "nx-terraform-plugin",
      "discovery",
    ]);
    expect(logtapeMocks.warn).toHaveBeenCalledWith(
      "Invalid manifest file",
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            message: "Invalid input: expected string, received undefined",
            path: ["provider"],
          }),
        ],
        path: expect.stringContaining("invalid-module/module.json"),
      }),
    );
    expect(logtapeMocks.warn).toHaveBeenCalledWith(
      "Invalid manifest file",
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            message: "Invalid semver version",
            path: ["version"],
          }),
        ],
        path: expect.stringContaining("invalid-module-two/module.json"),
      }),
    );
    expect(logtapeMocks.warn).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "invalid-module/module.json. provider: Invalid input: expected string, received undefined",
      ),
    );
  });

  it("ignores Go helpers that are not test files", () => {
    const moduleRoot = path.join("infra", "modules", "go-helper-only");

    const result = getDiscoveryState([
      path.join(moduleRoot, "main.tf"),
      path.join(moduleRoot, "tests", "helpers.go"),
    ]);

    expect(result.testCapabilitiesByRoot.has(moduleRoot)).toBe(false);
  });
});

describe("createNodesV2 publish inference", () => {
  it("warns and skips the publish target when merged options are invalid", async () => {
    const workspaceRoot = await createWorkspaceRoot();

    const moduleRoot = path.join("infra", "modules", "missing-owner");
    const configFiles = [
      path.join(moduleRoot, "main.tf"),
      path.join(moduleRoot, "module.json"),
    ];

    await fs.mkdir(path.join(workspaceRoot, moduleRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, moduleRoot, "main.tf"), "", {
      encoding: "utf-8",
    });
    await fs.writeFile(
      path.join(workspaceRoot, moduleRoot, "module.json"),
      JSON.stringify({
        description: "Terraform module description",
        provider: "aws",
        version: "1.2.3",
      }),
      "utf-8",
    );

    const result = await createNodesV2[1](
      configFiles,
      parseOptions({
        publish: {
          mode: "github",
        },
      }),
      {
        nxJsonConfiguration: {},
        workspaceRoot,
      },
    );

    expect(
      result[0]?.[1].projects?.[moduleRoot]?.targets?.["nx-release-publish"],
    ).toBeUndefined();
    expect(logtapeMocks.warn).toHaveBeenCalledWith(
      "Invalid publish options",
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            path: ["github", "owner"],
          }),
        ],
        path: expect.stringContaining("module.json"),
      }),
    );
  });
});
