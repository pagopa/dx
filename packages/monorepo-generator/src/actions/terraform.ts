import type { ActionType } from "plop";

import { Octokit } from "octokit";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";
import { fetchLatestSemver } from "./semver.js";

interface TerraformActionsDependencies {
  octokitClient: Octokit;
}

export const getGitHubTerraformProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "integrations";
    const repo = "terraform-provider-github";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "githubTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getDxGitHubBootstrapLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-github-github-environment-bootstrap";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxGithubEnvironmentBootstrapVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getTerraformLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "terraformVersion",
    );
  };

export const getPreCommitTerraformLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "antonbabenko";
    const repo = "pre-commit-terraform";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "preCommitTerraformVersion",
      (version) => `v${version.toString()}`,
    );
  };
