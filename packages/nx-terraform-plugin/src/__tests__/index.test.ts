import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { createNodesV2, getDiscoveryStateWithValidation } from "../index.ts";
import { parseOptions } from "../options.ts";

describe("createNodesV2", () => {
  it("discovers both terraform and module manifests", () => {
    expect(createNodesV2[0]).toBe("**/{*.tf,module.json}");
  });
});

describe("getDiscoveryStateWithValidation", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    await Promise.all(
      createdDirs
        .splice(0)
        .map((directory) => fs.rm(directory, { force: true, recursive: true })),
    );
  });

  it("collects only validated publishable roots and ignores test/example roots", async () => {
    const workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "nx-tf-plugin-"),
    );
    createdDirs.push(workspaceRoot);

    const configFiles = [
      path.join("infra", "_modules", "good-module", "main.tf"),
      path.join("infra", "_modules", "good-module", "module.json"),
      path.join("infra", "_modules", "good-module", "variables.tf"),
      path.join("infra", "_modules", "invalid-module", "module.json"),
      path.join("infra", "_modules", "invalid-module-two", "module.json"),
      path.join("infra", "_modules", "example", "module.json"),
      path.join("infra", "_modules", "tests", "main.tf"),
      path.join("infra", "resources", "prod", "main.tf"),
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
      path.join("infra", "resources", "prod", "main.tf"),
    ]);
    expect(Array.from(result.publishableManifestByRoot.keys())).toEqual([
      path.join("infra", "_modules", "good-module"),
    ]);
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
            message: "Invalid input: expected string, received undefined",
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

  it("warns and skips publish target inference when merged publish options are invalid", async () => {
    const workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "nx-tf-plugin-"),
    );
    createdDirs.push(workspaceRoot);

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
