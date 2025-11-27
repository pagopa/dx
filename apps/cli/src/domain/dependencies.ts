import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export type Dependencies = {
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
};
