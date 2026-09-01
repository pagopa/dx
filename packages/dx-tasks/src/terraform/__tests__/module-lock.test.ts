/**
 * Verifies dx-tasks Terraform Registry module lock generation.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";

import {
  calculateModuleHash,
  compareModuleLock,
  generateModuleLock,
  serializeModuleLock,
} from "../module-lock.ts";

interface MetadataModule {
  Key: string;
  Source: string;
  Version?: string;
}

const createProjectRoot = async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tf-init-lock-"));
  onTestFinished(async () => {
    await fs.rm(projectRoot, { force: true, recursive: true });
  });
  return projectRoot;
};

const writeMetadata = async (
  projectRoot: string,
  modules: readonly MetadataModule[],
) => {
  const modulesRoot = path.join(projectRoot, ".terraform", "modules");
  await fs.mkdir(modulesRoot, { recursive: true });
  await fs.writeFile(
    path.join(modulesRoot, "modules.json"),
    JSON.stringify({
      Modules: [{ Key: "", Source: "" }, ...modules],
    }),
    "utf8",
  );
};

const writeModule = async (
  projectRoot: string,
  key: string,
  {
    content = "resource",
  }: {
    content?: string;
  } = {},
) => {
  const modulePath = path.join(projectRoot, ".terraform", "modules", key);
  await fs.mkdir(modulePath, { recursive: true });
  await fs.writeFile(path.join(modulePath, "main.tf"), content, "utf8");
  return modulePath;
};

describe("calculateModuleHash", () => {
  it("matches the nested sha256sum algorithm used by lock-modules.sh", async () => {
    const projectRoot = await createProjectRoot();
    const modulePath = path.join(projectRoot, "module");
    await fs.mkdir(path.join(modulePath, "nested"), { recursive: true });
    await fs.mkdir(path.join(modulePath, ".terraform"), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(modulePath, "a.txt"), "alpha", "utf8"),
      fs.writeFile(path.join(modulePath, "nested", "b.txt"), "beta", "utf8"),
      fs.writeFile(
        path.join(modulePath, ".terraform", "ignored"),
        "ignored",
        "utf8",
      ),
    ]);

    const result = await calculateModuleHash(modulePath);

    expect(result).toBe(
      "165af13a83b5b6c0a239589df1767054f84a75ca63791e96e74c2473a1b578a2",
    );
  });

  it("matches sha256sum behavior for an empty module", async () => {
    const projectRoot = await createProjectRoot();
    const modulePath = path.join(projectRoot, "module");
    await fs.mkdir(modulePath);

    const result = await calculateModuleHash(modulePath);

    expect(result).toBe(
      "38acb15d02d5ac0f2a2789602e9df950c380d2799b4bdb59394e4eeabdd3a662",
    );
  });
});

describe("generateModuleLock", () => {
  it("locks registry modules and ignores other module sources", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "registry_module",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
        Version: "2.0.0",
      },
      {
        Key: "git_module",
        Source: "git::https://github.com/pagopa/dx.git",
      },
    ]);
    await writeModule(projectRoot, "registry_module");

    const lock = await generateModuleLock(projectRoot);

    expect(Object.keys(lock)).toEqual(["registry_module"]);
    expect(lock.registry_module).toEqual({
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      source:
        "https://registry.terraform.io/modules/pagopa-dx/example/azurerm/2.0.0",
    });
    expect(serializeModuleLock(lock)).toBe(
      `${JSON.stringify(
        {
          lockFileVersion: 2,
          modules: lock,
        },
        undefined,
        2,
      )}\n`,
    );
  });

  it("supports module keys that shadow object properties", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "constructor",
        Source: "registry.terraform.io/pagopa-dx/constructor/azurerm",
      },
      {
        Key: "__proto__",
        Source: "registry.terraform.io/pagopa-dx/proto/azurerm",
      },
    ]);
    await Promise.all([
      writeModule(projectRoot, "constructor"),
      writeModule(projectRoot, "__proto__"),
    ]);

    const comparison = await compareModuleLock(projectRoot);

    expect(comparison.changes).toEqual([
      { key: "__proto__", status: "added" },
      { key: "constructor", status: "added" },
    ]);
    expect(JSON.parse(comparison.content)).toMatchObject({
      lockFileVersion: 2,
    });
    expect(Object.keys(JSON.parse(comparison.content).modules)).toEqual([
      "__proto__",
      "constructor",
    ]);
  });

  it("rejects module keys that escape the Terraform module cache", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "nested/../../outside",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
      },
    ]);

    await expect(generateModuleLock(projectRoot)).rejects.toThrow(
      "Invalid Terraform module key outside the module cache: nested/../../outside",
    );
  });

  it("rejects module keys that resolve to the module cache itself", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "nested/..",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
      },
    ]);

    await expect(generateModuleLock(projectRoot)).rejects.toThrow(
      "Invalid Terraform module key outside the module cache: nested/..",
    );
  });

  it("allows module keys that only start with a parent directory prefix", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "..module",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
      },
    ]);
    await writeModule(projectRoot, "..module");

    await expect(generateModuleLock(projectRoot)).resolves.toHaveProperty(
      "..module",
    );
  });

  it("returns an empty lock when Terraform module metadata is missing", async () => {
    const projectRoot = await createProjectRoot();

    await expect(generateModuleLock(projectRoot)).resolves.toEqual({});
  });

  it("fails instead of producing a partial lock for a missing module folder", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "missing",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
      },
    ]);

    await expect(generateModuleLock(projectRoot)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("fails for malformed Terraform module metadata", async () => {
    const projectRoot = await createProjectRoot();
    const modulesRoot = path.join(projectRoot, ".terraform", "modules");
    await fs.mkdir(modulesRoot, { recursive: true });
    await fs.writeFile(
      path.join(modulesRoot, "modules.json"),
      JSON.stringify({ Modules: [{ Key: 12, Source: false }] }),
      "utf8",
    );

    await expect(generateModuleLock(projectRoot)).rejects.toThrow(
      /Invalid data.*modules\.json/,
    );
  });
});

describe("compareModuleLock", () => {
  it("reports, writes, and then accepts a new lock", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "example",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
      },
    ]);
    await writeModule(projectRoot, "example");

    const initial = await compareModuleLock(projectRoot);
    expect(initial).toMatchObject({
      changes: [{ key: "example", status: "added" }],
      isDifferent: true,
    });

    await fs.writeFile(initial.path, initial.content, "utf8");

    const unchanged = await compareModuleLock(projectRoot);
    expect(unchanged).toMatchObject({
      changes: [],
      isDifferent: false,
    });
  });

  it("reports changed and removed entries", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "changed",
        Source: "registry.terraform.io/pagopa-dx/changed/azurerm",
      },
    ]);
    const changedPath = await writeModule(projectRoot, "changed");
    const generated = await generateModuleLock(projectRoot);
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      serializeModuleLock({
        changed: {
          ...generated.changed,
          hash: "different",
        },
        removed: {
          hash: "removed",
          source: "removed",
        },
      }),
      "utf8",
    );

    const comparison = await compareModuleLock(projectRoot);

    expect(comparison.changes).toEqual([
      { key: "changed", status: "changed" },
      { key: "removed", status: "removed" },
    ]);
    expect(comparison.isDifferent).toBe(true);
    await expect(fs.stat(changedPath)).resolves.toBeDefined();
  });

  it("ignores formatting differences when entries are unchanged", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, []);
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      JSON.stringify({ lockFileVersion: 2, modules: {} }),
      "utf8",
    );

    const comparison = await compareModuleLock(projectRoot);

    expect(comparison.changes).toEqual([]);
    expect(comparison.content).toBe(
      `${JSON.stringify({ lockFileVersion: 2, modules: {} }, undefined, 2)}\n`,
    );
    expect(comparison.isDifferent).toBe(false);
  });

  it("preserves unchanged entries and sorts only new modules", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "zeta",
        Source: "registry.terraform.io/pagopa-dx/zeta/azurerm",
      },
      {
        Key: "beta",
        Source: "registry.terraform.io/pagopa-dx/beta/azurerm",
      },
      {
        Key: "alpha",
        Source: "registry.terraform.io/pagopa-dx/alpha/azurerm",
      },
      {
        Key: "aardvark",
        Source: "registry.terraform.io/pagopa-dx/aardvark/azurerm",
      },
    ]);
    await Promise.all([
      writeModule(projectRoot, "zeta"),
      writeModule(projectRoot, "beta"),
      writeModule(projectRoot, "alpha"),
      writeModule(projectRoot, "aardvark"),
    ]);
    const generated = await generateModuleLock(projectRoot);
    const existingLock = {
      alpha: {
        ...generated.alpha,
        source: "https://registry.terraform.io/modules/old/alpha",
      },
      zeta: {
        ...generated.zeta,
        source: "https://registry.terraform.io/modules/old/zeta",
      },
    };
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      serializeModuleLock(existingLock),
      "utf8",
    );

    const comparison = await compareModuleLock(projectRoot);
    const content = JSON.parse(comparison.content);

    expect(comparison.changes).toEqual([
      { key: "aardvark", status: "added" },
      { key: "beta", status: "added" },
    ]);
    expect(Object.keys(content.modules)).toEqual([
      "alpha",
      "zeta",
      "aardvark",
      "beta",
    ]);
    expect(content.modules.alpha).toEqual(existingLock.alpha);
    expect(content.modules.zeta).toEqual(existingLock.zeta);
    expect(content.modules.aardvark).toEqual(generated.aardvark);
    expect(content.modules.beta).toEqual(generated.beta);
  });

  it("preserves existing module order to avoid noisy lock diffs", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "alpha",
        Source: "registry.terraform.io/pagopa-dx/alpha/azurerm",
      },
      {
        Key: "zeta",
        Source: "registry.terraform.io/pagopa-dx/zeta/azurerm",
      },
    ]);
    await Promise.all([
      writeModule(projectRoot, "alpha"),
      writeModule(projectRoot, "zeta"),
    ]);
    const generated = await generateModuleLock(projectRoot);
    const existingLock = Object.fromEntries([
      ["zeta", generated.zeta],
      ["alpha", generated.alpha],
    ]);
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      serializeModuleLock(existingLock),
      "utf8",
    );

    const comparison = await compareModuleLock(projectRoot);

    expect(comparison.changes).toEqual([]);
    expect(comparison.content).toBe(serializeModuleLock(existingLock));
    expect(comparison.isDifferent).toBe(false);
  });
});

describe("module lock format", () => {
  it("marks legacy lockfiles for runtime migration", async () => {
    const projectRoot = await createProjectRoot();
    await writeMetadata(projectRoot, [
      {
        Key: "example",
        Source: "registry.terraform.io/pagopa-dx/example/azurerm",
        Version: "2.0.0",
      },
    ]);
    await writeModule(projectRoot, "example");
    const generated = await generateModuleLock(projectRoot);
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      JSON.stringify({
        example: {
          hash: generated.example.hash,
          name: "legacy",
          source: generated.example.source,
          version: "1.0.0",
        },
      }),
      "utf8",
    );

    const comparison = await compareModuleLock(projectRoot);

    expect(comparison.changes).toEqual([]);
    expect(comparison.formatVersion).toBe(1);
    expect(comparison.isDifferent).toBe(true);
    expect(JSON.parse(comparison.content)).toEqual({
      lockFileVersion: 2,
      modules: {
        example: generated.example,
      },
    });
  });

  it("rejects unsupported lockfile versions", async () => {
    const projectRoot = await createProjectRoot();
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      JSON.stringify({ lockFileVersion: 1, modules: {} }),
      "utf8",
    );

    await expect(compareModuleLock(projectRoot)).rejects.toThrow(
      /Invalid data.*tfmodules\.lock\.json/,
    );
  });

  it("rejects legacy metadata in version 2 entries", async () => {
    const projectRoot = await createProjectRoot();
    await fs.writeFile(
      path.join(projectRoot, "tfmodules.lock.json"),
      JSON.stringify({
        lockFileVersion: 2,
        modules: {
          example: {
            hash: "hash",
            name: "legacy",
            source: "source",
            version: "1.0.0",
          },
        },
      }),
      "utf8",
    );

    await expect(compareModuleLock(projectRoot)).rejects.toThrow(
      /Invalid data.*tfmodules\.lock\.json/,
    );
  });
});
