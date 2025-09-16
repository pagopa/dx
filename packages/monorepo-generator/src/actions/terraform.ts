import type { ActionType } from "plop";

import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { Octokit } from "octokit";
import { SemVer } from "semver";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";

interface TerraformActionsDependencies {
  octokitClient: Octokit;
}

const fetchLatestSemver = (
  fetchSemverFn: () => ResultAsync<null | SemVer, Error>,
  answers: Record<string, unknown>,
  answerKey: string,
) =>
  fetchSemverFn()
    .andThen((semver) =>
      semver ? okAsync(semver) : errAsync(new Error("Invalid version found")),
    )
    .match(
      ({ major, minor }) => {
        answers[answerKey] = `${major}.${minor}`;
        return `Fetched latest version: ${answers[answerKey]}`;
      },
      ({ message }) => {
        // eslint-disable-next-line no-console
        console.warn(`Could not fetch latest version`);
        // Plop handles the Promise rejection or exception thrown as a failure
        throw new Error(message);
      },
    );

export const getGitHubTerraformProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "integrations";
    const repo = "terraform-provider-github";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "githubTfProviderVersion",
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
    );
  };
