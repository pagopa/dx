import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dependenciesArraySchema, scriptsArraySchema } from "../codec.js";
import { makePackageJsonReader } from "../package-json.js";
import { makeMockPackageJson } from "./data.js";

describe("makePackageJsonReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const directory = "/some/dir";

  describe("getScripts", () => {
    it("should parse scripts from package.json", async () => {
      const mockPackageJson = makeMockPackageJson();
      const packageJson = JSON.stringify(mockPackageJson);

      const mockReadFile = vi
        .spyOn(fs, "readFile")
        .mockResolvedValueOnce(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const scripts = result.value;
        expect(scripts).toStrictEqual(
          scriptsArraySchema.parse(mockPackageJson.scripts),
        );
      }

      expect(mockReadFile).toHaveBeenCalledWith(
        `${directory}/package.json`,
        "utf-8",
      );
    });

    it("should return an empty array when no scripts exist", async () => {
      const mockPackageJson = JSON.stringify(
        makeMockPackageJson({ scripts: undefined }),
      );

      vi.spyOn(fs, "readFile").mockResolvedValueOnce(mockPackageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const scripts = result.value;
        expect(scripts).toStrictEqual([]);
      }
    });

    it("should return an error when package.json does not exist", async () => {
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(
        new Error("No such file or directory"),
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toContain("Failed to read package.json");
      }
    });

    it("should return an error when package.json is invalid JSON", async () => {
      vi.spyOn(fs, "readFile").mockResolvedValueOnce("invalid json content");

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toContain("Failed to parse JSON");
      }
    });
  });

  describe("getDependencies", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const directory = "/some/dir";

    it("should parse devDependencies from package.json", async () => {
      const mockPackageJson = makeMockPackageJson();
      const packageJson = JSON.stringify(mockPackageJson);

      const mockReadFile = vi
        .spyOn(fs, "readFile")
        .mockResolvedValueOnce(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual(
          dependenciesArraySchema.parse(mockPackageJson.devDependencies),
        );
      }

      expect(mockReadFile).toHaveBeenCalledWith(
        `${directory}/package.json`,
        "utf-8",
      );
    });

    it("should parse dependencies from package.json", async () => {
      const mockPackageJson = makeMockPackageJson();
      const packageJson = JSON.stringify(mockPackageJson);

      const mockReadFile = vi
        .spyOn(fs, "readFile")
        .mockResolvedValueOnce(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "prod");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual(
          dependenciesArraySchema.parse(mockPackageJson.dependencies),
        );
      }

      expect(mockReadFile).toHaveBeenCalledWith(
        `${directory}/package.json`,
        "utf-8",
      );
    });

    it("should return an empty array when no dependencies exist", async () => {
      const mockPackageJson = makeMockPackageJson({
        dependencies: undefined,
        devDependencies: undefined,
      });
      const packageJson = JSON.stringify(mockPackageJson);

      vi.spyOn(fs, "readFile").mockResolvedValueOnce(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual([]);
      }
    });

    it("should return an error when package.json does not exist for dependencies", async () => {
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(
        new Error("No such file or directory"),
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.message).toContain("Failed to read package.json");
      }
    });
  });
});
