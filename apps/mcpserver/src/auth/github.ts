import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { IncomingMessage } from "http";
import { z } from "zod/v4";

import type { AuthenticationStatus } from "../types.js";

const organizationsSchema = z
  .string()
  .transform((s) => s.split(",").map((v) => v.trim()))
  .pipe(z.array(z.string().nonempty()).nonempty())
  .catch(["pagopa"]);

const REQUIRED_ORGANIZATIONS = organizationsSchema.parse(
  process.env.REQUIRED_ORGANIZATIONS,
);

/**
 * Validates GitHub PAT-based access for requests hitting the MCP server.
 * @param request Incoming HTTP request carrying the PAT in the `x-gh-pat` header.
 * @returns Authentication status with the provided token, or throws 401 on failure.
 */
export async function startPATVerificationFlow(
  request: IncomingMessage,
): Promise<AuthenticationStatus> {
  const authHeader = request.headers["x-gh-pat"];
  const apiKey =
    typeof authHeader === "string"
      ? authHeader
      : Array.isArray(authHeader) && authHeader.length > 0
        ? authHeader[0]
        : undefined;

  if (!apiKey || !(await verifyGithubUser(apiKey))) {
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized",
    });
  }

  // The returned object is accessible in the `context.session`.
  return {
    authenticated: true,
    token: apiKey,
  };
}

/**
 * Verifies that a GitHub token belongs to a user who is in at least one required organization.
 * @param token GitHub personal access token to validate.
 * @returns true when the token holder is a member of the allowed organizations; otherwise false.
 */
export async function verifyGithubUser(token: string): Promise<boolean> {
  const logger = getLogger(["mcpserver", "github-auth"]);

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
    logger.error("Error verifying GitHub organization membership", { error });
    return false;
  }
}
