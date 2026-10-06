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
  createNodesV2,
  getDiscoveryState,
  getDiscoveryStateWithValidation,
} from "../index.ts";
import { parseOptions } from "../options.ts";

describe("createNodesV2", () => {
  it("discovers terraform, module manifests, and supported test files", () => {
    expect(createNodesV2[0]).toBe(
      "**/{*.tf,module.json,tests/*.tftest.hcl,tests/*_test.go}",
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

type CreateNodesResult = Awaited<ReturnType<(typeof createNodesV2)[1]>>;

const getProjectsFromCreateNodesResult = (result: CreateNodesResult) =>
  new Map(result.flatMap(([, node]) => Object.entries(node.projects ?? {})));

afterEach(() => {
  vi.clearAllMocks();
});

describe("Terraform project discovery", () => {
  it("infers applications and declared libraries but skips nested modules", () => {
    const applicationRoot = path.join("infra", "resources", "prod");
    const libraryRoot = path.join("infra", "modules", "azure_core_infra");
    const nestedModuleRoot = path.join(libraryRoot, "modules", "dns");
    const unmanifestedModuleRoot = path.join("infra", "_modules", "dx_website");

    const result = getDiscoveryState([
      path.join(applicationRoot, "main.tf"),
      path.join(libraryRoot, "main.tf"),
      path.join(libraryRoot, "module.json"),
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
      path.join("infra", "_modules", "good-module", "module.json"),
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
      path.join("infra", "_modules", "invalid-module", "module.json"),
      path.join("infra", "_modules", "invalid-module", "main.tf"),
      path.join("infra", "_modules", "invalid-module-two", "module.json"),
      path.join("infra", "_modules", "example", "module.json"),
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
        "_modules",
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
        "_modules",
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
      path.join("infra", "_modules", "good-module", "main.tf"),
      path.join("infra", "_modules", "good-module", "variables.tf"),
      path.join("infra", "_modules", "invalid-module", "main.tf"),
      path.join("infra", "resources", "prod", "main.tf"),
    ]);
    expect(Array.from(result.publishableManifestByRoot.keys())).toEqual([
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
      result.publishableManifestByRoot.get(
        path.join("infra", "_modules", "good-module"),
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
    const moduleRoot = path.join("infra", "_modules", "go-helper-only");

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

    const moduleRoot = path.join("infra", "_modules", "missing-owner");
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

describe("createNodesV2 shared module inputs", () => {
  it("adds transitive shared module files to consuming projects only", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const files: [string, string][] = [
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "alpha",
          "examples",
          "unused",
          "main.tf",
        ),
        'module "omega" { source = "../../omega" }',
      ],
      [
        path.join("infra", "resources", "_modules", "alpha", "main.tf"),
        'module "beta" { source = "../beta" }\nmodule "declared_valid" { source = "../declared-valid" }\nmodule "declared_invalid" { source = "../declared-invalid" }\nmodule "nested_child" { source = "./modules/child" }\nmodule "ignored_example" { source = "./examples/unused" }\nmodule "ignored_test" { source = "./tests/unused" }\nmodule "local" { source = "../../local" }',
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "alpha",
          "modules",
          "child",
          "main.tf",
        ),
        'module "delta" { source = "../../../delta" }',
      ],
      [
        path.join("infra", "resources", "_modules", "alpha", "README.md"),
        "# alpha",
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "alpha",
          "tests",
          "unused.tf",
        ),
        'module "sigma" { source = "../../sigma" }',
      ],
      [
        path.join("infra", "resources", "_modules", "beta", "main.tf"),
        'module "gamma" { source = "../gamma" }',
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "declared-invalid",
          "main.tf",
        ),
        'module "epsilon" { source = "../epsilon" }',
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "declared-invalid",
          "module.json",
        ),
        `{"description":"Terraform module without provider","version":"1.2.3"}`,
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "declared-valid",
          "main.tf",
        ),
        'module "zeta" { source = "../zeta" }',
      ],
      [
        path.join(
          "infra",
          "resources",
          "_modules",
          "declared-valid",
          "module.json",
        ),
        `{"description":"Terraform module description","provider":"aws","version":"1.2.3"}`,
      ],
      [path.join("infra", "resources", "_modules", "delta", "main.tf"), ""],
      [
        path.join("infra", "resources", "_modules", "gamma", "main.tf"),
        'module "child" { source = "../alpha/modules/child" }',
      ],
      [
        path.join("infra", "resources", "dev", "main.tf"),
        'module "alpha" { source = "../_modules/alpha" }',
      ],
      [
        path.join("infra", "resources", "prod", "main.tf"),
        'module "beta" { source = "../_modules/beta" }',
      ],
      [path.join("infra", "resources", "uat", "main.tf"), ""],
    ];

    await Promise.all(
      files.map(async ([fileName, content]) => {
        await fs.mkdir(path.join(workspaceRoot, path.dirname(fileName)), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(workspaceRoot, fileName),
          content,
          "utf-8",
        );
      }),
    );

    const result = await createNodesV2[1](
      files.map(([fileName]) => fileName),
      parseOptions(undefined),
      {
        nxJsonConfiguration: {},
        workspaceRoot,
      },
    );
    const projects = getProjectsFromCreateNodesResult(result);
    const expectInputs = (root: string, expected: string[]) => {
      expect(
        [...(projects.get(root)?.namedInputs?.default ?? [])].sort(),
      ).toEqual([...expected].sort());
    };

    expect(Array.from(projects.keys()).sort()).toEqual(
      [
        path.join("infra", "resources", "dev"),
        path.join("infra", "resources", "prod"),
        path.join("infra", "resources", "_modules", "declared-invalid"),
        path.join("infra", "resources", "_modules", "declared-valid"),
        path.join("infra", "resources", "uat"),
      ].sort(),
    );
    expectInputs(path.join("infra", "resources", "dev"), [
      "{projectRoot}/*.{tf,tfvars}",
      "{workspaceRoot}/infra/resources/_modules/alpha/**/*",
      "{workspaceRoot}/infra/resources/_modules/beta/**/*",
      "{workspaceRoot}/infra/resources/_modules/gamma/**/*",
      "{workspaceRoot}/infra/resources/_modules/alpha/modules/child/**/*",
      "{workspaceRoot}/infra/resources/_modules/delta/**/*",
    ]);
    expectInputs(path.join("infra", "resources", "prod"), [
      "{projectRoot}/*.{tf,tfvars}",
      "{workspaceRoot}/infra/resources/_modules/beta/**/*",
      "{workspaceRoot}/infra/resources/_modules/gamma/**/*",
      "{workspaceRoot}/infra/resources/_modules/alpha/modules/child/**/*",
      "{workspaceRoot}/infra/resources/_modules/delta/**/*",
    ]);
    expectInputs(
      path.join("infra", "resources", "_modules", "declared-valid"),
      ["{projectRoot}/*.{tf,tfvars}"],
    );
    expectInputs(
      path.join("infra", "resources", "_modules", "declared-invalid"),
      ["{projectRoot}/*.{tf,tfvars}"],
    );
    expectInputs(path.join("infra", "resources", "uat"), [
      "{projectRoot}/*.{tf,tfvars}",
    ]);
  });
});
