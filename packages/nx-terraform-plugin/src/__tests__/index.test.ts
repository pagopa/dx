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
  createNodes,
  getDiscoveryState,
  getDiscoveryStateWithValidation,
} from "../index.ts";
import { parseOptions } from "../options.ts";

describe("createNodes", () => {
  it("matches Terraform projects and supported test files", () => {
    expect(createNodes[0]).toBe(
      "**/{*.tf,project.json,tests/*.tftest.hcl,tests/*_test.go}",
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

describe("Terraform project discovery", () => {
  it("only processes Terraform roots with project.json", () => {
    const applicationRoot = path.join("infra", "resources", "prod");
    const libraryRoot = path.join("infra", "modules", "azure_core_infra");
    const nestedModuleRoot = path.join(libraryRoot, "modules", "dns");
    const unmanifestedModuleRoot = path.join("infra", "_modules", "dx_website");

    const result = getDiscoveryState([
      path.join(applicationRoot, "main.tf"),
      path.join(applicationRoot, "project.json"),
      path.join(libraryRoot, "main.tf"),
      path.join(libraryRoot, "project.json"),
      path.join(nestedModuleRoot, "main.tf"),
      path.join(unmanifestedModuleRoot, "main.tf"),
    ]);

    expect(result.terraformConfigFiles).toEqual([
      path.join(applicationRoot, "main.tf"),
      path.join(libraryRoot, "main.tf"),
    ]);
  });

  it("collects test capabilities and only validated publishable roots", async () => {
    const workspaceRoot = await createWorkspaceRoot();

    const configFiles = [
      path.join("infra", "_modules", "good-module", "main.tf"),
      path.join("infra", "_modules", "good-module", "project.json"),
      path.join("infra", "_modules", "good-module", "tests", "unit.tftest.hcl"),
      path.join(
        "infra",
        "_modules",
        "good-module",
        "tests",
        "integration.tftest.hcl",
      ),
      path.join("infra", "_modules", "good-module", "tests", "e2e_test.go"),
      path.join("infra", "_modules", "good-module", "variables.tf"),
      path.join("infra", "_modules", "invalid-module", "project.json"),
      path.join("infra", "_modules", "invalid-module", "main.tf"),
      path.join("infra", "_modules", "invalid-module-two", "main.tf"),
      path.join("infra", "_modules", "invalid-module-two", "project.json"),
      path.join("infra", "_modules", "example", "project.json"),
      path.join("infra", "_modules", "tests", "main.tf"),
      path.join("infra", "resources", "prod", "main.tf"),
      path.join("packages", "web", "tests", "e2e_test.go"),
    ];

    await fs.mkdir(
      path.join(workspaceRoot, "infra", "_modules", "good-module"),
      { recursive: true },
    );
    await fs.mkdir(
      path.join(workspaceRoot, "infra", "_modules", "invalid-module"),
      { recursive: true },
    );
    await fs.mkdir(
      path.join(workspaceRoot, "infra", "_modules", "invalid-module-two"),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "_modules",
        "good-module",
        "project.json",
      ),
      JSON.stringify({
        metadata: {
          description: "Terraform module description",
          provider: "aws",
          version: "1.2.3",
        },
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "_modules",
        "invalid-module-two",
        "project.json",
      ),
      JSON.stringify({
        metadata: {
          description: "Terraform module without version",
          provider: "aws",
        },
      }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(
        workspaceRoot,
        "infra",
        "_modules",
        "invalid-module",
        "project.json",
      ),
      JSON.stringify({
        metadata: {
          description: "Terraform module without provider",
          version: "1.2.3",
        },
      }),
      "utf-8",
    );

    const result = await getDiscoveryStateWithValidation(
      configFiles,
      workspaceRoot,
    );

    expect(result.terraformConfigFiles).toEqual([
      path.join("infra", "_modules", "good-module", "main.tf"),
      path.join("infra", "_modules", "good-module", "variables.tf"),
      path.join("infra", "_modules", "invalid-module", "main.tf"),
      path.join("infra", "_modules", "invalid-module-two", "main.tf"),
    ]);
    expect(Array.from(result.publishableMetadataByRoot.keys())).toEqual([
      path.join("infra", "_modules", "good-module"),
    ]);
    expect(
      result.testCapabilitiesByRoot.get(
        path.join("infra", "_modules", "good-module"),
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
      result.publishableMetadataByRoot.get(
        path.join("infra", "_modules", "good-module"),
      ),
    ).toEqual({
      description: "Terraform module description",
      provider: "aws",
      version: "1.2.3",
    });
    expect(logtapeMocks.getLogger).toHaveBeenCalledWith([
      "nx-terraform",
      "discovery",
    ]);
    expect(logtapeMocks.warn).toHaveBeenCalledWith(
      "Invalid Terraform publishing metadata",
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            message: "Invalid input: expected string, received undefined",
            path: ["provider"],
          }),
        ],
        path: expect.stringContaining("invalid-module/project.json"),
      }),
    );
    expect(logtapeMocks.warn).toHaveBeenCalledWith(
      "Invalid Terraform publishing metadata",
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            message: "Invalid semver version",
            path: ["version"],
          }),
        ],
        path: expect.stringContaining("invalid-module-two/project.json"),
      }),
    );
    expect(logtapeMocks.warn).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "invalid-module/project.json. provider: Invalid input: expected string, received undefined",
      ),
    );
  });

  it("ignores Go helpers that are not test files", () => {
    const moduleRoot = path.join("infra", "_modules", "go-helper-only");

    const result = getDiscoveryState([
      path.join(moduleRoot, "main.tf"),
      path.join(moduleRoot, "tests", "helpers.go"),
    ]);

    expect(result.testCapabilitiesByRoot.has(moduleRoot)).toBe(false);
  });
});

describe("createNodes publish inference", () => {
  it("does not create a node when project.json is absent", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const moduleRoot = path.join("infra", "_modules", "unconfigured");
    await fs.mkdir(path.join(workspaceRoot, moduleRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, moduleRoot, "main.tf"), "");

    const result = await createNodes[1](
      [path.join(moduleRoot, "main.tf")],
      parseOptions(undefined),
      { nxJsonConfiguration: {}, workspaceRoot },
    );

    expect(result).toEqual([]);
  });

  it("returns only inferred targets for a project.json root", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const moduleRoot = path.join("infra", "_modules", "configured");
    await fs.mkdir(path.join(workspaceRoot, moduleRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, moduleRoot, "main.tf"), "");
    await fs.writeFile(
      path.join(workspaceRoot, moduleRoot, "project.json"),
      JSON.stringify({ name: "configured-module" }),
    );

    const result = await createNodes[1](
      [path.join(moduleRoot, "main.tf"), path.join(moduleRoot, "project.json")],
      parseOptions(undefined),
      { nxJsonConfiguration: {}, workspaceRoot },
    );

    expect(result[0]?.[1].projects?.[moduleRoot]).toEqual({
      root: moduleRoot,
      targets: expect.objectContaining({
        docs: expect.any(Object),
        fmt: expect.any(Object),
        init: expect.any(Object),
      }),
    });
  });

  it("warns and skips the publish target when merged options are invalid", async () => {
    const workspaceRoot = await createWorkspaceRoot();

    const moduleRoot = path.join("infra", "_modules", "missing-owner");
    const configFiles = [
      path.join(moduleRoot, "main.tf"),
      path.join(moduleRoot, "project.json"),
    ];

    await fs.mkdir(path.join(workspaceRoot, moduleRoot), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, moduleRoot, "main.tf"), "", {
      encoding: "utf-8",
    });
    await fs.writeFile(
      path.join(workspaceRoot, moduleRoot, "project.json"),
      JSON.stringify({
        metadata: {
          description: "Terraform module description",
          provider: "aws",
          version: "1.2.3",
        },
      }),
      "utf-8",
    );

    const result = await createNodes[1](
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
        path: expect.stringContaining("project.json"),
      }),
    );
  });
});

describe("createNodes existing project inference", () => {
  it("does not infer nodes for unconfigured shared modules", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const applicationRoots = [
      path.join("infra", "resources", "dev"),
      path.join("infra", "resources", "prod"),
      path.join("infra", "resources", "uat"),
      path.join("infra", "resources", "prod", "networking"),
      path.join("infra", "network", "dev"),
    ];
    const resourcesSharedRoot = path.join("infra", "resources", "_modules");
    const networkSharedRoot = path.join("infra", "network", "_modules");
    const libraryRoot = path.join("infra", "modules", "published");
    const projectJsonPath = path.join(libraryRoot, "project.json");
    const configFiles = [
      ...applicationRoots.flatMap((root) => [
        path.join(root, "main.tf"),
        path.join(root, "project.json"),
      ]),
      path.join(resourcesSharedRoot, "shared", "main.tf"),
      path.join(resourcesSharedRoot, "shared", "new-module", "outputs.tf"),
      path.join(networkSharedRoot, "shared", "main.tf"),
      path.join(libraryRoot, "main.tf"),
      projectJsonPath,
    ];

    await Promise.all(
      applicationRoots.map(async (root) => {
        const mainFile = path.join(workspaceRoot, root, "main.tf");
        await fs.mkdir(path.dirname(mainFile), { recursive: true });
        await fs.writeFile(mainFile, 'module "broken" { source =');
      }),
    );
    await fs.mkdir(path.join(workspaceRoot, libraryRoot), { recursive: true });
    await fs.writeFile(
      path.join(workspaceRoot, projectJsonPath),
      JSON.stringify({
        metadata: {
          description: "Terraform module description",
          provider: "aws",
          version: "1.2.3",
        },
      }),
    );

    const result = await createNodes[1](configFiles, parseOptions(undefined), {
      nxJsonConfiguration: {},
      workspaceRoot,
    });
    const projects = new Map(
      result.flatMap(([, node]) => Object.entries(node.projects ?? {})),
    );
    expect(Array.from(projects.keys()).sort()).toEqual(
      [...applicationRoots, libraryRoot].sort(),
    );
    expect(Object.keys(projects.get(applicationRoots[0]) ?? {}).sort()).toEqual(
      ["root", "targets"],
    );
    expect(projects.get(applicationRoots[0])?.targets).toEqual(
      expect.objectContaining({
        apply: expect.any(Object),
        plan: expect.any(Object),
      }),
    );
    expect(projects.get(libraryRoot)?.targets).toEqual(
      expect.objectContaining({
        docs: expect.any(Object),
      }),
    );
    expect(projects.get(resourcesSharedRoot)).toBeUndefined();
    expect(
      projects.get(path.join(resourcesSharedRoot, "shared", "new-module")),
    ).toBeUndefined();
  });
});
