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

/**
 * Fetches the latest semantic version using the provided fetch function and writes
 * a formatted version string into the given `answers` object under `answerKey`.
 *
 * @param fetchSemverFn - A zero-arg function that returns a `ResultAsync` resolving
 *   to a `SemVer` (or `null`) or rejecting with an `Error`. Typically wraps an
 *   Octokit call to fetch a release or tag and parse its semver.
 * @param answers - Mutable answers object (plop prompts) where the resulting
 *   formatted version will be stored.
 * @param answerKey - Key name to assign the formatted version into `answers`.
 * @param semverFormatFn - Optional formatter that converts the `SemVer` into
 *   the desired string representation (defaults to `semver.toString()`).
 * @returns A human-readable message indicating the fetched version. Throws an
 *   `Error` if the fetch fails or yields an invalid version.
 */
const fetchLatestSemver = async (
  fetchSemverFn: () => ResultAsync<null | SemVer, Error>,
  answers: Record<string, unknown>,
  answerKey: string,
  semverFormatFn: (semver: SemVer) => string = (semver) => semver.toString(),
) => {
  const version = await fetchSemverFn()
    .andThen((semver) =>
      semver ? okAsync(semver) : errAsync(new Error("Invalid version found")),
    )
    .map(semverFormatFn);

  if (version.isErr()) {
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
