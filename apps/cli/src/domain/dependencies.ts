import { ResultAsync } from "neverthrow";

import { AuthorizationService } from "./authorization.js";
import { GitHubService } from "./github.js";
import { PackageJsonReader } from "./package-json.js";
import { RepositoryReader } from "./repository.js";
import { ValidationReporter } from "./validation.js";

export type Dependencies = {
  packageJsonReader: PackageJsonReader;
  repositoryReader: RepositoryReader;
  requireGitHubAuth: GitHubAuthFactory;
  validationReporter: ValidationReporter;
};

/** Services that require a GitHub PAT to be instantiated. */
export type GitHubAuthDeps = {
  authorizationService: AuthorizationService;
  gitHubService: GitHubService;
};

/**
 * Lazily resolves GitHub-authenticated services.
 * Commands that need GitHub access call this factory inside their action
 * handler so that auth is only required when those commands actually run.
 * Returns a `ResultAsync` so auth failures (e.g. missing GH_TOKEN) can be
 * routed through the same neverthrow error pipeline used by the commands.
 */
export type GitHubAuthFactory = () => ResultAsync<GitHubAuthDeps, Error>;
