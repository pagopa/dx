import type { ActionType } from "plop";

import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { SemVer } from "semver";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";

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
        throw new Error(message);
      },
    );

export const getGitHubTerraformProviderLatestRelease =
  (): ActionType => async (answers) => {
    const owner = "integrations";
    const repo = "terraform-provider-github";

    return fetchLatestSemver(
      () => fetchLatestRelease({ owner, repo }),
      answers,
      "githubTfProviderVersion",
    );
  };

export const getDxGitHubBootstrapLatestTag =
  (): ActionType => async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-github-github-environment-bootstrap";

    return fetchLatestSemver(
      () => fetchLatestTag({ owner, repo }),
      answers,
      "dxGithubEnvironmentBootstrapVersion",
    );
  };
