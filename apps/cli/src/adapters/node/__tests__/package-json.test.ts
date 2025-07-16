import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

      expect(result).toStrictEqual(
        ok(new Map().set("build", "tsc").set("code-review", "eslint .")),
      );

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

      expect(result).toStrictEqual(ok(new Map()));
    });

    it("should return an error when package.json does not exist", async () => {
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(
        new Error("No such file or directory"),
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result).toStrictEqual(
        err(new Error("Failed to read file: /some/dir/package.json")),
      );
    });

    it("should return an error when package.json is invalid JSON", async () => {
      vi.spyOn(fs, "readFile").mockResolvedValueOnce("invalid json content");

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
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

      expect(result).toStrictEqual(
        ok(new Map().set("turbo", "^2.5.2").set("typescript", "^5.0.0")),
      );

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

      expect(result).toStrictEqual(
        ok(
          new Map()
            .set("aDependency", "^4.17.21")
            .set("anotherDependency", "^8.0.0"),
        ),
      );

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

      expect(result).toStrictEqual(ok(new Map()));
    });

    it("should return an error when package.json does not exist for dependencies", async () => {
      vi.spyOn(fs, "readFile").mockRejectedValueOnce(
        new Error("No such file or directory"),
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result).toStrictEqual(
        err(new Error("Failed to read file: /some/dir/package.json")),
      );
    });
  });
});
