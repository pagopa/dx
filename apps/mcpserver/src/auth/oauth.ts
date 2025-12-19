import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";
import { OAuthProxy } from "fastmcp/auth";

import type { AuthenticationStatus } from "../types.js";

import { getConfig } from "../config/auth.js";
import { verifyGithubUser } from "./github.js";

const logger = getLogger(["mcpserver", "oauth"]);

let authProxy: OAuthProxy;
const authConfig = await getConfig();

/**
 * Returns a lazily initialized OAuth proxy for GitHub.
 * @returns Shared OAuthProxy instance bound to the server configuration.
 */
export async function getOAuthProvider(): Promise<OAuthProxy> {
  if (!authProxy) {
    authProxy = await initializeOAuthProvider();
  }
  return authProxy;
}

/**
 * Builds the GitHub OAuth proxy using client credentials from SSM.
 * @returns Initialized OAuthProxy ready for OAuth flows.
 */
export async function initializeOAuthProvider(): Promise<OAuthProxy> {
  logger.debug("Fetching GitHub client ID from SSM...");
  const clientId = authConfig.GITHUB_CLIENT_ID;
  logger.debug(`GitHub client ID retrieved: ${clientId ? "✓" : "✗ (empty)"}`);

  logger.debug("Fetching GitHub client secret from SSM...");
  const clientSecret = authConfig.GITHUB_CLIENT_SECRET;
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
 * Verifies an incoming OAuth bearer token and ensures the GitHub user is authorized.
 * @param request Incoming HTTP request containing the Authorization header.
 * @returns Authentication status with token if valid, otherwise undefined to trigger OAuth flow.
 */
export async function startOAuthFlow(
  request: IncomingMessage,
): Promise<AuthenticationStatus | undefined> {
  const authHeader = request.headers["authorization"];
  const authSchema = "Bearer ";

  // If the token is missing, return undefined to indicate unauthenticated request
  // This will start the OAuth flow when accessing protected resources
  if (!authHeader?.startsWith(authSchema)) {
    logger.debug("No token, returning undefined for 401 response");
    return undefined;
  }

  const token = authHeader.slice(authSchema.length); // Remove "Bearer "
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
