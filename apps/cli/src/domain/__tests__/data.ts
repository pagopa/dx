import { mock } from "vitest-mock-extended";

import { Config } from "../../config.js";
import {
  DependencyVersionValidator,
  PackageJsonReader,
} from "../package-json.js";
import { RepositoryReader } from "../repository.js";
import { ValidationReporter } from "../validation.js";

export const makeMockDependencies = () => ({
  dependencyVersionValidator: mock<DependencyVersionValidator>(),
  packageJsonReader: mock<PackageJsonReader>(),
  repositoryReader: mock<RepositoryReader>(),
  validationReporter: mock<ValidationReporter>(),
});

export const makeMockConfig = (): Config => ({
  minVersions: {
    turbo: "2.5.0",
  },
});
