import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { z } from "zod/v4";

import { logger } from "../config/logging.js";

const organizationsSchema = z
  .array(z.string().nonempty())
  .nonempty()
  .transform((orgs) => orgs.map((org) => org.trim()))
  .catch(["pagopa"]);

const REQUIRED_ORGANIZATIONS = organizationsSchema.parse(
  process.env.REQUIRED_ORGANIZATIONS,
);

/**
 * Verifies that a user, identified by a GitHub personal access token, is a member
 * of at least one of the required GitHub organizations.
 * @param token The user's GitHub personal access token.
 * @returns A boolean indicating whether the user is a member of a required organization.
 */
export async function verifyGithubUser(token: string): Promise<boolean> {
  const logger = getLogger(["mcpserver", "github-auth"]);

  if (!token) {
    return false;
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Fetches the user's organization memberships using Octokit.
    const { data: organizations }: { data: { login: string }[] } =
      await octokit.rest.orgs.listForAuthenticatedUser();

    const isMember = organizations.some((org) =>
      REQUIRED_ORGANIZATIONS.includes(org.login),
    );

    if (isMember) {
      logger.debug(
        `User is a member of one of the required organizations: ${REQUIRED_ORGANIZATIONS.join(", ")}`,
      );
    } else {
      logger.warn(
        `User is not a member of any of the required organizations: ${REQUIRED_ORGANIZATIONS.join(", ")}`,
      );
    }

    return isMember;
  } catch (error) {
    logger.error("Error verifying GitHub organization membership:", { error });
    return false;
  }
}
