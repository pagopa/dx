import { CliDependencies } from "../adapters/commander/index.js";
import { type PackageJson, PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export type Dependencies = CliDependencies & {
  packageJson: PackageJson;
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
};
