// Provides the concrete Octokit-backed GitHub repository adapter for publish flows.

import { Octokit } from "octokit";

export const getGitHubToken = (): string | undefined =>
  process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

const getAuthenticatedUserLogin = async (
  octokit: Octokit,
  owner: string,
): Promise<string> => {
  try {
    const authenticatedUser = await octokit.rest.users.getAuthenticated();
    return authenticatedUser.data.login;
  } catch (error) {
    throw new Error(
      `Cannot create repository for user owner "${owner}" without user-scoped GitHub credentials. GitHub App installation tokens can create organization repositories, but not user-owned repositories.`,
      { cause: error },
    );
  }
};

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

  const authenticatedUserLogin = await getAuthenticatedUserLogin(
    octokit,
    owner,
  );
  if (authenticatedUserLogin !== owner) {
    throw new Error(
      `Cannot create repository for user owner "${owner}" with authenticated user "${authenticatedUserLogin}".`,
    );
  }

  await octokit.rest.repos.createForAuthenticatedUser({
    name: repo,
    visibility: "public",
  });
};
