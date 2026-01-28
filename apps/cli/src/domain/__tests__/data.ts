import { Octokit } from "octokit";
import { DeepMockProxy, mock, mockDeep, MockProxy } from "vitest-mock-extended";

import { Config } from "../../config.js";
import { GitHubService } from "../github.js";
import {
  Dependency,
  PackageJson,
  PackageJsonReader,
  Script,
} from "../package-json.js";
import { RepositoryReader } from "../repository.js";
import { ValidationReporter } from "../validation.js";

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
  gitHubService: MockProxy<GitHubService>;
  octokit: DeepMockProxy<Octokit>;
  packageJsonReader: MockProxy<PackageJsonReader>;
  repositoryReader: MockProxy<RepositoryReader>;
  validationReporter: MockProxy<ValidationReporter>;
} => ({
  gitHubService: mock<GitHubService>(),
  octokit: mockDeep<Octokit>(),
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
  validationReporter: mock<ValidationReporter>(),
});

export const makeMockConfig = (): Config => ({
  minVersions: {
    turbo: "2.5.0",
  },
});

export const makeMockRepositoryRoot = (): string => "a/repo/root";
