import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";
import { OAuthProxy } from "fastmcp/auth";

import { getConfig } from "../config/auth.js";
import { verifyGithubUser } from "./github.js";

const logger = getLogger(["mcpserver", "oauth"]);

let authProxy: OAuthProxy;
const authConfig = await getConfig();

/**
 * Gets the initialized OAuth provider.
 * @throws Error if the provider hasn't been initialized yet.
 */
export async function getOAuthProvider(): Promise<OAuthProxy> {
  if (!authProxy) {
    authProxy = await initializeOAuthProvider();
  }
  return authProxy;
}

/**
 * Initializes the GitHub OAuth provider with the client secret.
 * Must be called before accessing the authProxy.
 */
export async function initializeOAuthProvider(): Promise<OAuthProxy> {
  logger.debug("Fetching GitHub client ID from SSM...");
  const clientId = await authConfig.GITHUB_CLIENT_ID;
  logger.debug(`GitHub client ID retrieved: ${clientId ? "✓" : "✗ (empty)"}`);

  logger.debug("Fetching GitHub client secret from SSM...");
  const clientSecret = await authConfig.GITHUB_CLIENT_SECRET;
  logger.debug(
    `GitHub client secret retrieved: ${clientSecret ? "✓" : "✗ (empty)"}`,
  );

  logger.debug("Creating GitHubProvider instance...");
  return new OAuthProxy({
    baseUrl: authConfig.MCP_SERVER_URL,
    enableTokenSwap: false,
    scopes: ["user"],
    upstreamAuthorizationEndpoint: "https://github.com/login/oauth/authorize",
    upstreamClientId: clientId,
    upstreamClientSecret: clientSecret,
    upstreamTokenEndpoint: "https://github.com/login/oauth/access_token",
  });
}

/**
 *
 * @param request
 * @returns An object containing authentication status and GitHub token, or undefined if unauthenticated.
 */
export async function startOAuthFlow(request: IncomingMessage): Promise<
  | undefined
  | {
      authenticated: boolean;
      token: null | string;
    }
> {
  const authHeader = request.headers["authorization"];

  // If the token is missing, return undefined to indicate unauthenticated request
  // This will start the OAuth flow when accessing protected resources
  if (!authHeader?.startsWith("Bearer ")) {
    logger.debug("No token, returning undefined for 401 response");
    return undefined;
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  logger.debug(`[Authenticate] Token received, starting verification...`);

  const isMember = await verifyGithubUser(token).catch((error) => {
    logger.error("Error verifying GitHub user during OAuth flow", { error });
    return undefined;
  });

  if (!isMember) {
    logger.warn("GitHub user is not a member of the required organizations");
    return undefined;
  }

  return {
    authenticated: true,
    token: token,
  };
}
