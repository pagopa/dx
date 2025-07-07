import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dependenciesArraySchema, scriptsArraySchema } from "../codec.js";
import { makePackageJsonReader } from "../package-json.js";
import { makeMockPackageJson } from "./data.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const mockReadFile = (content: string) =>
  (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    content,
  );

describe("makePackageJsonReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const directory = "/some/dir";

  describe("getScripts", () => {
    it("should parse scripts from package.json", async () => {
      const mockPackageJson = makeMockPackageJson();
      const packageJson = JSON.stringify(mockPackageJson);

      mockReadFile(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const scripts = result.value;
        expect(scripts).toStrictEqual(
          scriptsArraySchema.parse(mockPackageJson.scripts),
        );
      }

      expect(readFile).toHaveBeenCalledWith(
        `${directory}/package.json`,
        "utf-8",
      );
    });

    it("should return an empty array when no scripts exist", async () => {
      const mockPackageJson = JSON.stringify(
        makeMockPackageJson({ scripts: undefined }),
      );

      mockReadFile(mockPackageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(directory);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const scripts = result.value;
        expect(scripts).toStrictEqual([]);
      }
    });

    it("should return an error when package.json does not exist", async () => {
      (readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
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
      mockReadFile("invalid json content");

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

      mockReadFile(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual(
          dependenciesArraySchema.parse(mockPackageJson.devDependencies),
        );
      }

      expect(readFile).toHaveBeenCalledWith(
        `${directory}/package.json`,
        "utf-8",
      );
    });

    it("should parse dependencies from package.json", async () => {
      const mockPackageJson = makeMockPackageJson();
      const packageJson = JSON.stringify(mockPackageJson);

      mockReadFile(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "prod");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual(
          dependenciesArraySchema.parse(mockPackageJson.dependencies),
        );
      }

      expect(readFile).toHaveBeenCalledWith(
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

      mockReadFile(packageJson);

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(directory, "dev");

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const dependencies = result.value;
        expect(dependencies).toStrictEqual([]);
      }
    });

    it("should return an error when package.json does not exist for dependencies", async () => {
      (readFile as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
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
