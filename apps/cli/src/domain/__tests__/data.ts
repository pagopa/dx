import { mock } from "vitest-mock-extended";

import { Config } from "../../config.js";
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

export const makeMockDependencies = () => ({
  packageJson: makeMockPackageJson(),
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
  validationReporter: mock<ValidationReporter>(),
});

export const makeMockConfig = (): Config => ({
  minVersions: {
    turbo: "2.5.0",
  },
  repository: {
    root: "a/repo/root",
  },
});
