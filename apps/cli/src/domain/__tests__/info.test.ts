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
      mockDependencies.repositoryReader.readFile.mockReturnValue(
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
      mockDependencies.repositoryReader.readFile.mockReturnValue(
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

  it("should return all info", async () => {
    const mockPackageJson = makeMockPackageJson({
      devDependencies: new Map([["turbo", "^2.5.0"]]),
    });
    const config = makeMockConfig();
    const mockDependencies = {
      ...makeMockDependencies(),
      packageJson: mockPackageJson,
    };

    mockDependencies.repositoryReader.readFile
      .mockReturnValueOnce(okAsync("\n22.0.0\n"))
      .mockReturnValueOnce(okAsync("1.0.0\n"));

    const result = await getInfo(mockDependencies, config);
    expect(result).toStrictEqual({
      node: "22.0.0",
      packageManager: "pnpm",
      terraform: "1.0.0",
      turbo: "^2.5.0",
    });
    expect(mockDependencies.repositoryReader.readFile).toHaveBeenCalledWith(
      "a/repo/root/.node-version",
    );
    expect(mockDependencies.repositoryReader.readFile).toHaveBeenCalledWith(
      "a/repo/root/.terraform-version",
    );
  });

  it("should only required information", async () => {
    const config = makeMockConfig();
    const mockDependencies = makeMockDependencies();

    mockDependencies.repositoryReader.readFile.mockReturnValue(
      errAsync(new Error("File not found")),
    );

    const result = await getInfo(mockDependencies, config);
    expect(result).toStrictEqual({
      node: undefined,
      packageManager: "pnpm",
      terraform: undefined,
      turbo: undefined,
    });
  });
});
