import { getLogger } from "@logtape/logtape";
import { Octokit } from "@octokit/rest";
import { IncomingMessage } from "http";
import { z } from "zod/v4";

const organizationsSchema = z
  .string()
  .transform((s) => s.split(",").map((v) => v.trim()))
  .pipe(z.array(z.string().nonempty()).nonempty())
  .catch(["pagopa"]);

const REQUIRED_ORGANIZATIONS = organizationsSchema.parse(
  process.env.REQUIRED_ORGANIZATIONS,
);

export async function startPATVerificationFlow(
  request: IncomingMessage,
): Promise<{
  authenticated: boolean;
  token: string;
}> {
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
 * Verifies that a user, identified by a GitHub personal access token, is a member
 * of at least one of the required GitHub organizations.
 * @param token The user's GitHub personal access token.
 * @returns A boolean indicating whether the user is a member of a required organization.
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
