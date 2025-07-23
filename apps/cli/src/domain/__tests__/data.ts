import { mock } from "vitest-mock-extended";

import { Config } from "../../config.js";
import {
  Dependency,
  DependencyName,
  PackageJson,
  PackageJsonReader,
  PackageName,
  Script,
} from "../package-json.js";
import { RepositoryReader } from "../repository.js";
import { ValidationReporter } from "../validation.js";

export const makeMockPackageJson = (
  overrides: Partial<PackageJson> = {},
): PackageJson => {
  const basePackageJson: PackageJson = {
    dependencies: new Map<DependencyName, Dependency["version"]>(),
    devDependencies: new Map<DependencyName, Dependency["version"]>(),
    name: "test-package" as PackageName,
    packageManager:
      "pnpm@10.13.1+sha512.37ebf1a5c7a30d5fabe0c5df44ee8da4c965ca0c5af3dbab28c3a1681b70a256218d05c81c9c0dcf767ef6b8551eb5b960042b9ed4300c59242336377e01cfad",
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
});
