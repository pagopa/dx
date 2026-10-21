import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { hasPublishableTerraformMetadata } from "../discovery.ts";

describe("hasPublishableTerraformMetadata", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
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
});
