// Provides the concrete Octokit-backed GitHub repository adapter for publish flows.

import { Octokit } from "octokit";

const getGitHubToken = () => process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

export const ensureGitHubRepository = async (
  owner: string,
  repo: string,
): Promise<void> => {
  const octokit = new Octokit({
    auth: getGitHubToken(),
  });

  try {
    await octokit.rest.repos.get({
      owner,
      repo,
    });
    return;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("status" in error) ||
      error.status !== 404
    ) {
      throw error;
    }
  }

  await octokit.rest.repos.createInOrg({
    name: repo,
    org: owner,
    visibility: "public",
  });
};
