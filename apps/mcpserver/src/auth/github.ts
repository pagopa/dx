import axios from "axios";

import { logger } from "../utils/logger.js";

const GITHUB_API_URL = "https://api.github.com";
// A list of required GitHub organizations, configurable via environment variable.
const REQUIRED_ORGANIZATIONS = (
  process.env["REQUIRED_ORGANIZATIONS"] || "pagopa"
)
  .split(",")
  .map((org) => org.trim());

type Org = {
  login: string;
};

/**
 * Verifies that a user, identified by a GitHub personal access token, is a member
 * of at least one of the required GitHub organizations.
 * @param token The user's GitHub personal access token.
 * @returns A boolean indicating whether the user is a member of a required organization.
 */
export async function verifyGithubUser(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    // Fetches the user's organization memberships from the GitHub API.
    const response = await axios.get(`${GITHUB_API_URL}/user/orgs`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
      },
    });

    logger.info("GitHub API response:", response.data);

    const organizations = response.data as Org[];
    const isMember = organizations.some((org: Org) =>
      REQUIRED_ORGANIZATIONS.includes(org.login),
    );

    if (isMember) {
      logger.info(
        `User is a member of one of the required organizations: ${REQUIRED_ORGANIZATIONS.join(", ")}`,
      );
    } else {
      logger.warn(
        `User is not a member of any of the required organizations: ${REQUIRED_ORGANIZATIONS.join(", ")}`,
      );
    }

    return isMember;
  } catch (error) {
    logger.error(error, "Error verifying GitHub organization membership:");
    return false;
  }
}
