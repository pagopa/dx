import { vol } from "memfs";
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makePackageJsonReader } from "../package-json.js";
import { makeMockPackageJson } from "./data.js";

vi.mock("node:fs/promises");

describe("makePackageJsonReader", () => {
  const mockPackageJson = makeMockPackageJson();
  const rootDir = "/some/dir";
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(
      {
        "./package.json": JSON.stringify(mockPackageJson),
      },
      rootDir,
    );
  });

  describe("getScripts", () => {
    it("should parse scripts from package.json", async () => {
      const spy = vi.spyOn(fs, "readFile");

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(rootDir);

      expect(result).toStrictEqual(
        ok(new Map().set("build", "tsc").set("code-review", "eslint .")),
      );
      expect(spy).toHaveBeenCalledWith(`${rootDir}/package.json`, "utf-8");
    });

    it("should return an empty array when no scripts exist", async () => {
      vol.fromJSON(
        {
          "./package.json": JSON.stringify(
            makeMockPackageJson({ scripts: undefined }),
          ),
        },
        rootDir,
      );

      const spy = vi.spyOn(fs, "readFile");

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(rootDir);

      expect(result).toStrictEqual(ok(new Map()));
      expect(spy).toHaveBeenCalledWith(`${rootDir}/package.json`, "utf-8");
    });

    it("should return an error when package.json does not exist", async () => {
      vol.reset();

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(rootDir);

      expect(result).toStrictEqual(
        err(new Error("Failed to read file: /some/dir/package.json")),
      );
    });

    it("should return an error when package.json is invalid JSON", async () => {
      vol.fromJSON(
        {
          "./package.json": "invalid json content",
        },
        rootDir,
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getScripts(rootDir);

      expect(result).toStrictEqual(err(new Error("Failed to parse JSON")));
    });
  });

  describe("getDependencies", () => {
    it("should parse devDependencies from package.json", async () => {
      const spy = vi.spyOn(fs, "readFile");

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(rootDir, "dev");

      expect(result).toStrictEqual(
        ok(new Map().set("turbo", "^2.5.2").set("typescript", "^5.0.0")),
      );

      expect(spy).toHaveBeenCalledWith(`${rootDir}/package.json`, "utf-8");
    });

    it("should parse dependencies from package.json", async () => {
      const spy = vi.spyOn(fs, "readFile");
      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(rootDir, "prod");

      expect(result).toStrictEqual(
        ok(
          new Map()
            .set("aDependency", "^4.17.21")
            .set("anotherDependency", "^8.0.0"),
        ),
      );

      expect(spy).toHaveBeenCalledWith(`${rootDir}/package.json`, "utf-8");
    });

    it("should return an empty array when no dependencies exist", async () => {
      vol.reset();
      vol.fromJSON(
        {
          "./package.json": JSON.stringify(
            makeMockPackageJson({
              dependencies: undefined,
              devDependencies: undefined,
            }),
          ),
        },
        rootDir,
      );

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(rootDir, "dev");

      expect(result).toStrictEqual(ok(new Map()));
    });

    it("should return an error when package.json does not exist for dependencies", async () => {
      vol.reset();

      const packageJsonReader = makePackageJsonReader();
      const result = await packageJsonReader.getDependencies(rootDir, "dev");

      expect(result).toStrictEqual(
        err(new Error("Failed to read file: /some/dir/package.json")),
      );
    });
  });
});
