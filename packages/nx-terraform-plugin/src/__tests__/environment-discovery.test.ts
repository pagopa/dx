import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { readEnvironmentManifest } from "../discovery.ts";

describe("readEnvironmentManifest", () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdDirs
        .splice(0)
        .map((directory) => fs.rm(directory, { force: true, recursive: true })),
    );
  });

  it("returns the parsed manifest when environment.json exists and is valid", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "terraform-environment-"),
    );
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "environment.json"),
      JSON.stringify({ version: "0.1.0" }),
      "utf-8",
    );

    await expect(readEnvironmentManifest(root)).resolves.toEqual({
      version: "0.1.0",
    });
  });

  it("returns undefined when environment.json does not exist", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "terraform-environment-"),
    );
    createdDirs.push(root);

    await expect(readEnvironmentManifest(root)).resolves.toBeUndefined();
  });

  it("returns undefined and warns when environment.json is invalid JSON", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "terraform-environment-"),
    );
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "environment.json"),
      "{ invalid json }",
      "utf-8",
    );

    await expect(readEnvironmentManifest(root)).resolves.toBeUndefined();
  });

  it("returns undefined when environment.json is missing the version field", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "terraform-environment-"),
    );
    createdDirs.push(root);
    await fs.writeFile(
      path.join(root, "environment.json"),
      JSON.stringify({}),
      "utf-8",
    );

    await expect(readEnvironmentManifest(root)).resolves.toBeUndefined();
  });
});
