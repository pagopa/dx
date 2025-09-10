import type { ActionType } from "plop";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";

export const getGitHubTerraformProviderLatestRelease: ActionType = async (
  answers,
) => {
  const owner = "integrations";
  const repo = "terraform-provider-github";
  const githubTerraformProviderReleaseResult = await fetchLatestRelease({
    owner,
    repo,
  });

  if (githubTerraformProviderReleaseResult.isOk()) {
    answers.githubTfProviderVersion = `${githubTerraformProviderReleaseResult.value?.major ?? 1}.${githubTerraformProviderReleaseResult.value?.minor ?? 1}`;
    return `Fetched latest ${owner}/${repo} version ${answers.githubTfProviderVersion}`;
  }

  const fallback = "1.0";
  answers.githubTfProviderVersion = fallback;
  return `Failed to fetch latest ${owner}/${repo} version: ${githubTerraformProviderReleaseResult.error?.message ?? "unknown"}. Using fallback ${fallback}`;
};

export const getDxGitHubBootstrapLatestTag: ActionType = async (answers) => {
  const owner = "pagopa-dx";
  const repo = "terraform-github-github-environment-bootstrap";
  const bootstrapProviderTagResult = await fetchLatestTag({
    owner,
    repo,
  });

  if (bootstrapProviderTagResult.isOk()) {
    answers.githubTfProviderVersion = `${bootstrapProviderTagResult.value?.major ?? 1}.${bootstrapProviderTagResult.value?.minor ?? 1}`;
    return `Fetched latest ${owner}/${repo} version ${answers.githubTfProviderVersion}`;
  }

  const fallback = "1.1";
  answers.githubTfProviderVersion = fallback;
  return `Failed to fetch latest ${owner}/${repo} version: ${bootstrapProviderTagResult.error?.message ?? "unknown"}. Using fallback ${fallback}`;
};
