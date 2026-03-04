import { AuthorizationService } from "./authorization.js";
import { GitHubService } from "./github.js";
import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export type Dependencies = {
  authorizationService: AuthorizationService;
  gitHubService: GitHubService;
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  validationReporter: ValidationReporter;
};
