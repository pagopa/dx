/**
 * Workspace effects port.
 *
 * Defines the side-effectful operations that `dx init` performs after scaffolding
 * files: creating the remote repository, pushing code, and opening a pull request.
 * In production these execute real terraform/git/GitHub API calls; in dry-run mode
 * they are replaced by stubs that log intended operations into SandboxState.
 */

import { ResultAsync } from "neverthrow";

import { type Payload as MonorepoPayload } from "../adapters/plop/generators/monorepo/index.js";
import { PullRequest, Repository } from "./github.js";

export type RepositoryPullRequest = {
  pr?: PullRequest;
  repository: Repository;
};

export type WorkspaceEffects = {
  /**
   * Creates the remote GitHub repository via terraform and pushes the scaffolded
   * code, then opens a pull request. Returns the repository and optional PR.
   */
  publishRepository(
    payload: MonorepoPayload,
  ): ResultAsync<RepositoryPullRequest, Error>;
};
