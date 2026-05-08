import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => ({
  configurePackageLogger: vi.fn(async () => {}),
  getPackageLogger: vi.fn(() => ({
    warn: loggerMocks.warn,
  })),
  warn: vi.fn(),
}));

vi.mock("../logger.ts", () => ({
  configurePackageLogger: loggerMocks.configurePackageLogger,
  getPackageLogger: loggerMocks.getPackageLogger,
}));

import { createNodesV2, getDiscoveryStateWithValidation } from "../index.ts";

describe("createNodesV2", () => {
  it("discovers both terraform and module manifests", () => {
    expect(createNodesV2[0]).toBe("**/{*.tf,module.json}");
  });
});

describe("getDiscoveryStateWithValidation", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
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
    expect(loggerMocks.configurePackageLogger).toHaveBeenCalledWith();
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith(["discovery"]);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
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
    expect(loggerMocks.warn).not.toHaveBeenCalledWith(
      expect.stringContaining(
        "invalid-module/module.json. provider: Invalid input: expected string, received undefined",
      ),
    );
  });
});
