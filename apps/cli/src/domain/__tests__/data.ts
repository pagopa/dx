import type { MockProxy } from "vitest-mock-extended";

import { mock } from "vitest-mock-extended";

import { Config } from "../../config.js";
import { GitHubAuthFactory } from "../dependencies.js";
import {
  Dependency,
  PackageJson,
  PackageJsonReader,
  Script,
} from "../package-json.js";
import { RepositoryReader } from "../repository.js";

export const makeMockPackageJson = (
  overrides: Partial<PackageJson> = {},
): PackageJson => {
  const basePackageJson: PackageJson = {
    dependencies: new Map<Dependency["name"], Dependency["version"]>(),
    devDependencies: new Map<Dependency["name"], Dependency["version"]>(),
    name: "test-package" as PackageJson["name"],
    packageManager: "pnpm",
    scripts: new Map<Script["name"], Script["script"]>(),
  };
  return {
    ...basePackageJson,
    ...overrides,
  };
};

export const makeMockDependencies = (): {
  packageJsonReader: MockProxy<PackageJsonReader>;
  repositoryReader: MockProxy<RepositoryReader>;
  requireGitHubAuth: GitHubAuthFactory;
} => ({
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
  requireGitHubAuth: mock<GitHubAuthFactory>(),
});

export const makeMockConfig = (): Config => ({
  minVersions: {
    nx: "22",
  },
});

export const makeMockRepositoryRoot = (): string => "a/repo/root";
