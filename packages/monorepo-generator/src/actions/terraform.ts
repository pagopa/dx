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

const fetchLatestSemver = async (
  fetchSemverFn: () => ResultAsync<null | SemVer, Error>,
  answers: Record<string, unknown>,
  answerKey: string,
) => {
  const version = await fetchSemverFn()
    .andThen((semver) =>
      semver ? okAsync(semver) : errAsync(new Error("Invalid version found")),
    )
    .map(({ major, minor }) => `${major}.${minor}`);

  if (version.isErr()) {
    // eslint-disable-next-line no-console
    console.warn(`Could not fetch latest version`);
    throw new Error("Could not fetch latest version", { cause: version.error });
  }
  answers[answerKey] = version.value;
  return `Fetched latest version: ${answers[answerKey]}`;
};

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
