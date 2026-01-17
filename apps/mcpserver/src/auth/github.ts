/**
 * GitHub authentication utilities.
 *
 * These helpers are configured from the entrypoint to avoid module side effects.
 */

import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";

type GithubAuthConfig = {
  createOctokit?: (token: string) => Octokit;
  requiredOrganizations: string[];
};

/**
 * Verifies that a user, identified by a GitHub personal access token, is a member
 * of at least one of the required GitHub organizations.
 * @param token The user's GitHub personal access token.
 * @returns A boolean indicating whether the user is a member of a required organization.
 */
export function createGithubUserVerifier({
  createOctokit,
  requiredOrganizations,
}: GithubAuthConfig): (token: string) => Promise<boolean> {
  const logger = getLogger(["mcpserver", "github-auth"]);
  const buildOctokit =
    createOctokit ?? ((token: string) => new Octokit({ auth: token }));

  return async function verifyGithubUser(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const octokit = buildOctokit(token);

    try {
      // Fetches the user's organization memberships using Octokit.
      const { data: organizations } =
        await octokit.rest.orgs.listForAuthenticatedUser();

      const isMember = organizations.some((org) =>
        requiredOrganizations.includes(org.login),
      );

      if (isMember) {
        logger.debug(
          `User is a member of one of the required organizations: ${requiredOrganizations.join(", ")}`,
        );
      } else {
        logger.warn(
          `User is not a member of any of the required organizations: ${requiredOrganizations.join(", ")}`,
        );
      }

      return isMember;
    } catch (error) {
      logger.error("Error verifying GitHub organization membership", { error });
      return false;
    }
  };
}
