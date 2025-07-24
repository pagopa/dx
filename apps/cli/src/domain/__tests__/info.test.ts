import { ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { getInfo } from "../info.js";
import {
  makeMockConfig,
  makeMockDependencies,
  makeMockPackageJson,
} from "./data.js";

describe("getInfo", () => {
  it("should return default packageManager (npm) when packageManager is not detected", async () => {
    const mockPackageJson = makeMockPackageJson({ packageManager: undefined });
    const mockDependencies = {
      ...makeMockDependencies(),
      packageJson: mockPackageJson,
    };
    const config = makeMockConfig();
    mockDependencies.repositoryReader.fileExists.mockResolvedValue(ok(false));

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
    const result = await getInfo(mockDependencies, config);
    expect(result.packageManager).toStrictEqual("pnpm");
  });

  it("should return yarn when yarn.lock is present", async () => {
    const mockPackageJson = makeMockPackageJson({ packageManager: undefined });
    const mockDependencies = {
      ...makeMockDependencies(),
      packageJson: mockPackageJson,
    };
    mockDependencies.repositoryReader.fileExists
      .mockResolvedValueOnce(
        ok(false), // pnpm lock file does not exist
      )
      .mockResolvedValueOnce(ok(true)); // yarn lock file exists

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
