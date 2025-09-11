import type { ActionType } from "plop";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";
import { Config } from "../config.js";

export const getGitHubTerraformProviderLatestRelease =
  (
    fallbackVersion: Config["terraform"]["providers"]["github"]["fallbackVersion"],
  ): ActionType =>
  async (answers) => {
    const owner = "integrations";
    const repo = "terraform-provider-github";

    return await fetchLatestRelease({
      owner,
      repo,
    })
      .andTee(
        (semver) =>
          // If semver is null, it means that the latest release tag is not a valid semver
          semver === null &&
          // eslint-disable-next-line no-console
          console.warn(
            `Could not fetch latest release for ${owner}/${repo}, using fallback version ${fallbackVersion}`,
          ),
      )
      // Make sure to have a non-null version
      .map((semver) => semver ?? fallbackVersion)
      .match(
        ({ major, minor }) => {
          answers.githubTfProviderVersion = `${major}.${minor}`;
          return `Fetched latest ${owner}/${repo} version ${answers.githubTfProviderVersion}`;
        },
        ({ message }) => {
          answers.githubTfProviderVersion = `${fallbackVersion.major}.${fallbackVersion.minor}`;
          return `${message}, using fallback version ${answers.githubTfProviderVersion}`;
        },
      );
  };

export const getDxGitHubBootstrapLatestTag =
  (
    fallbackVersion: Config["terraform"]["dxModules"]["githubEnvironmentBootstrap"]["fallbackVersion"],
  ): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-github-github-environment-bootstrap";

    return await fetchLatestTag({
      owner,
      repo,
    })
      .map((semver) => semver ?? fallbackVersion)
      .match(
        ({ major, minor }) => {
          answers.dxGithubEnvironmentBootstrapVersion = `${major}.${minor}`;
          return `Fetched latest ${owner}/${repo} tag ${answers.dxGithubEnvironmentBootstrapVersion}`;
        },
        ({ message }) => {
          answers.dxGithubEnvironmentBootstrapVersion = `${fallbackVersion.major}.${fallbackVersion.minor}`;
          return `${message}, using fallback version ${answers.dxGithubEnvironmentBootstrapVersion}`;
        },
      );
  };
