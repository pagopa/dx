/**
 * GitHub Authentication Module
 *
 * This module provides GitHub user verification functionality using the
 * GitHub API to check organization membership.
 *
 * Features:
 * - Organization membership verification
 * - Support for multiple required organizations
 * - GitHub PAT (Personal Access Token) validation
 *
 * @module auth/github
 */

import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { z } from "zod/v4";

/**
 * Parses and validates REQUIRED_ORGANIZATIONS environment variable
 * Expects a comma-separated list of organization names
 * Defaults to ["pagopa"] if not provided or invalid
 */
const organizationsSchema = z
  .string()
  .transform((s) => s.split(",").map((v) => v.trim()))
  .pipe(z.array(z.string().nonempty()).nonempty())
  .catch(["pagopa"]);

const REQUIRED_ORGANIZATIONS = organizationsSchema.parse(
  process.env.REQUIRED_ORGANIZATIONS,
);

/**
 * Verifies that a GitHub token belongs to a user who is in at least one required organization
 *
 * This function:
 * 1. Creates an authenticated Octokit client with the provided token
 * 2. Fetches the user's organization memberships
 * 3. Checks if the user belongs to any of the REQUIRED_ORGANIZATIONS
 *
 * @param token - GitHub Personal Access Token to validate
 * @returns true when the token holder is a member of the allowed organizations; otherwise false
 *
 * @example
 * ```typescript
 * const isValid = await verifyGithubUser(token);
 * if (!isValid) {
 *   throw new Error("User not authorized");
 * }
 * ```
 */
export async function verifyGithubUser(token: string): Promise<boolean> {
  const logger = getLogger(["mcpserver", "github-auth"]);

  // Create authenticated Octokit client
  const octokit = new Octokit({ auth: token });

  try {
    // Fetch all organizations the authenticated user is a member of
    const { data: organizations }: { data: { login: string }[] } =
      await octokit.rest.orgs.listForAuthenticatedUser();

    // Check if user is member of at least one required organization
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
    // Log error but don't expose details to client
    logger.error("Error verifying GitHub organization membership", { error });
    return false;
  }
}
