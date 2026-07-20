// Provides the concrete Octokit-backed GitHub repository adapter for publish flows.

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";

export interface GitHubAppCredentials {
  clientId: string;
  privateKey: string;
}

export const createGitHubAppOctokit = (
  credentials: GitHubAppCredentials,
): Octokit =>
  new Octokit({
    auth: {
      appId: credentials.clientId,
      privateKey: credentials.privateKey,
    },
    authStrategy: createAppAuth,
  });

// Resolves the owner installation and creates the short-lived token used by
// git and repository API calls during the Terraform module publish flow.
export const createGitHubAppToken = async (
  owner: string,
  credentials: GitHubAppCredentials,
  appOctokit: Octokit,
): Promise<string> => {
  const installation = await appOctokit.rest.apps.getOrgInstallation({
    org: owner,
  });
  const auth = createAppAuth({
    appId: credentials.clientId,
    installationId: installation.data.id,
    privateKey: credentials.privateKey,
  });
  const authentication = await auth({
    permissions: {
      contents: "write",
    },
    type: "installation",
  });

  return authentication.token;
};

export const revokeGitHubAppToken = async (octokit: Octokit): Promise<void> => {
  await octokit.rest.apps.revokeInstallationAccessToken();
};

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
  octokit: Octokit,
): Promise<void> => {
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
