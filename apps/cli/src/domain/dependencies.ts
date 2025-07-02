import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export interface Dependencies {
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
}
