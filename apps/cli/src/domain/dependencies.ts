import {
  DependencyVersionValidator,
  PackageJsonReader,
} from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export interface Dependencies {
  dependencyVersionValidator: DependencyVersionValidator;
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
}
