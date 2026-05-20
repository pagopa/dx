/**
 * Injectable dependencies for the Plop layer.
 *
 * This module defines the ports that Plop generators and actions consume,
 * decoupling them from concrete adapter construction (Octokit, AzureCliCredential, etc.).
 * In production the runtime provides real implementations; in dry-run/test mode
 * it supplies fakes backed by SandboxState.
 */

import { type Octokit } from "octokit";

import {
  CloudAccountRepository,
  CloudAccountService,
} from "../../domain/cloud-account.js";
import { type GitHubService } from "../../domain/github.js";

export type PlopDependencies = {
  cloudAccountRepository: CloudAccountRepository;
  cloudAccountService: CloudAccountService;
  gitHubService: GitHubService;
  releaseClient: ReleaseClient;
};

/**
 * A thin wrapper exposing only the `request` method from Octokit,
 * used exclusively for fetching GitHub releases.
 * In dry-run mode this is replaced by a deterministic stub.
 */
export type ReleaseClient = Pick<Octokit, "request">;
