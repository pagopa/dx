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

  const ownerProfile = await octokit.rest.users.getByUsername({
    username: owner,
  });

  if (ownerProfile.data.type === "Organization") {
    await octokit.rest.repos.createInOrg({
      name: repo,
      org: owner,
      visibility: "public",
    });
    return;
  }

  const authenticatedUser = await octokit.rest.users.getAuthenticated();
  if (authenticatedUser.data.login !== owner) {
    throw new Error(
      `Cannot create repository for user owner "${owner}" with authenticated user "${authenticatedUser.data.login}".`,
    );
  }

  await octokit.rest.repos.createForAuthenticatedUser({
    name: repo,
    visibility: "public",
  });
};
