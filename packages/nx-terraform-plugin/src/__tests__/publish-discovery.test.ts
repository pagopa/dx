import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { hasPublishableModuleManifest } from "../publish/discovery.ts";

describe("hasPublishableModuleManifest", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirs
        .splice(0)
        .map((directory) => fs.rm(directory, { force: true, recursive: true })),
    );
  });

  it("returns true when module.json exists and is valid", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-module-"));
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "module.json"),
      JSON.stringify({
        description: "Terraform module",
        version: "1.2.3",
      }),
      "utf-8",
    );

    await expect(hasPublishableModuleManifest(root)).resolves.toBe(true);
  });

  it("returns false when module.json does not exist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-module-"));
    createdDirs.push(root);

    await expect(hasPublishableModuleManifest(root)).resolves.toBe(false);
  });

  it("returns false when module.json is invalid", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "terraform-module-"));
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "module.json"),
      JSON.stringify({
        version: "1.2.3",
      }),
      "utf-8",
    );

    await expect(hasPublishableModuleManifest(root)).resolves.toBe(false);
  });
});
