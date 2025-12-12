import { Octokit } from "octokit";

import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export type Dependencies = {
  octokit: Octokit;
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
};
