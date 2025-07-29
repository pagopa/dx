import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { getInfo } from "../info.js";
import {
  makeMockConfig,
  makeMockDependencies,
  makeMockPackageJson,
} from "./data.js";

describe("getInfo", () => {
  describe("packageManager", () => {
    it("should return default packageManager (npm) when packageManager is not detected", async () => {
      const mockPackageJson = makeMockPackageJson({
        packageManager: undefined,
      });
      const mockDependencies = {
        ...makeMockDependencies(),
        packageJson: mockPackageJson,
      };
      const config = makeMockConfig();
      mockDependencies.repositoryReader.fileExists.mockReturnValue(
        okAsync(false),
      );
      mockDependencies.repositoryReader.readFile.mockReturnValueOnce(
        okAsync("22.0.0"),
      );

      const result = await getInfo(mockDependencies, config);
      expect(result.packageManager).toStrictEqual("npm");

      expect(mockDependencies.repositoryReader.fileExists).nthCalledWith(
        1,
        "a/repo/root/pnpm-lock.yaml",
      );
      expect(mockDependencies.repositoryReader.fileExists).nthCalledWith(
        2,
        "a/repo/root/yarn.lock",
      );
      expect(mockDependencies.repositoryReader.fileExists).nthCalledWith(
        3,
        "a/repo/root/package-lock.json",
      );
    });

    it("should return the packageManager when present in the package.json", async () => {
      const mockDependencies = makeMockDependencies();
      const config = makeMockConfig();
      mockDependencies.repositoryReader.readFile.mockReturnValueOnce(
        okAsync("22.0.0"),
      );
      const result = await getInfo(mockDependencies, config);
      expect(result.packageManager).toStrictEqual("pnpm");
    });

    it("should return yarn when yarn.lock is present", async () => {
      const mockPackageJson = makeMockPackageJson({
        packageManager: undefined,
      });
      const mockDependencies = {
        ...makeMockDependencies(),
        packageJson: mockPackageJson,
      };
      mockDependencies.repositoryReader.fileExists
        .mockReturnValueOnce(
          okAsync(false), // pnpm lock file does not exist
        )
        .mockReturnValueOnce(okAsync(true)); // yarn lock file exists
      mockDependencies.repositoryReader.readFile.mockReturnValueOnce(
        okAsync("22.0.0"),
      );

      const config = makeMockConfig();
      const result = await getInfo(mockDependencies, config);
      expect(result.packageManager).toStrictEqual("yarn");

      expect(mockDependencies.repositoryReader.fileExists).nthCalledWith(
        1,
        "a/repo/root/pnpm-lock.yaml",
      );
      expect(mockDependencies.repositoryReader.fileExists).nthCalledWith(
        2,
        "a/repo/root/yarn.lock",
      );
      expect(
        mockDependencies.repositoryReader.fileExists,
      ).not.toHaveBeenCalledWith("a/repo/root/package-lock.json");
    });
  });

  describe("node", () => {
    it("should not return node version if .node-version file does not exist", async () => {
      const mockDependencies = makeMockDependencies();
      mockDependencies.repositoryReader.readFile.mockReturnValueOnce(
        errAsync(new Error("File not found")),
      );

      const config = makeMockConfig();
      const result = await getInfo(mockDependencies, config);
      expect(result.node).toBeUndefined();
      expect(mockDependencies.repositoryReader.readFile).toHaveBeenCalledWith(
        "a/repo/root/.node-version",
      );
    });
    it("should return the node version", async () => {
      const mockDependencies = makeMockDependencies();
      mockDependencies.repositoryReader.readFile.mockReturnValueOnce(
        okAsync("22.0.0"),
      );

      const config = makeMockConfig();
      const result = await getInfo(mockDependencies, config);
      expect(result.node).toStrictEqual("22.0.0");
    });
  });

  describe("terraform", () => {
    it("should return undefined when .terraform-version file does not exist", async () => {
      const mockDependencies = makeMockDependencies();
      const config = makeMockConfig();

      mockDependencies.repositoryReader.readFile.mockReturnValue(
        errAsync(new Error("File not found")),
      );

      const result = await getInfo(mockDependencies, config);
      expect(result.terraform).toBeUndefined();

      expect(mockDependencies.repositoryReader.readFile).toHaveBeenCalledWith(
        "a/repo/root/.terraform-version",
      );
    });

    it("should return the terraform version when .terraform-version file exists", async () => {
      const mockDependencies = makeMockDependencies();
      const config = makeMockConfig();

      mockDependencies.repositoryReader.readFile.mockReturnValue(
        okAsync("1.0.0"),
      );

      const result = await getInfo(mockDependencies, config);
      expect(result.terraform).toStrictEqual("1.0.0");

      expect(mockDependencies.repositoryReader.readFile).toHaveBeenCalledWith(
        "a/repo/root/.terraform-version",
      );
    });
  });
});
