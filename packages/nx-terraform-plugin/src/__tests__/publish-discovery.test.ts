import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => ({
  warn: vi.fn(),
}));

vi.mock("../logger.ts", () => ({
  getPackageLogger: vi.fn(() => ({
    warn: loggerMocks.warn,
  })),
}));

import {
  hasPublishableTerraformMetadata,
  readTerraformProjectMetadata,
} from "../discovery.ts";

describe("hasPublishableTerraformMetadata", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    await Promise.all(
      createdDirs
        .splice(0)
        .map((directory) => fs.rm(directory, { force: true, recursive: true })),
    );
  });

  it("returns true when project.json has valid Terraform metadata", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-project-"));
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "project.json"),
      JSON.stringify({
        metadata: {
          description: "Terraform module",
          provider: "aws",
          version: "1.2.3",
        },
      }),
      "utf-8",
    );

    await expect(hasPublishableTerraformMetadata(root)).resolves.toBe(true);
  });

  it("returns false when project.json has no Terraform metadata", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-project-"));
    createdDirs.push(root);
    await fs.writeFile(path.join(root, "project.json"), '{"name":"module"}');

    await expect(hasPublishableTerraformMetadata(root)).resolves.toBe(false);
  });

  it("returns false when Terraform metadata is invalid", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-project-"));
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "project.json"),
      JSON.stringify({
        metadata: {
          version: "1.2.3",
        },
      }),
      "utf-8",
    );

    await expect(hasPublishableTerraformMetadata(root)).resolves.toBe(false);
  });

  it("reads metadata from project.json with comments and trailing commas", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-project-"));
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "project.json"),
      `{
        // Terraform module publishing metadata
        "metadata": {
          "description": "Terraform module",
          "provider": "aws",
          "version": "1.2.3",
        },
      }`,
      "utf-8",
    );

    await expect(readTerraformProjectMetadata(root)).resolves.toMatchObject({
      description: "Terraform module",
      provider: "aws",
      version: "1.2.3",
    });
  });

  it("warns and returns undefined when project.json is malformed", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-project-"));
    createdDirs.push(root);
    const projectJsonPath = path.join(root, "project.json");
    await fs.writeFile(projectJsonPath, '{"metadata": ', "utf-8");

    await expect(readTerraformProjectMetadata(root)).resolves.toBeUndefined();
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Invalid project configuration at ${projectJsonPath}.`,
      ),
    );
  });
});
