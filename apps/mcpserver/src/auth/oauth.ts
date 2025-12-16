import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";
import { JWTIssuer, OAuthProxy } from "fastmcp/auth";

import { authConfig } from "../config/auth.js";
import { region } from "../config/aws.js";
import { DynamoDBStore } from "./ddbTokenStore.js";
import { verifyGithubUser } from "./github.js";

const logger = getLogger(["mcpserver", "oauth"]);

let authProxy: OAuthProxy;

/**
 * Gets the initialized OAuth provider.
 * @throws Error if the provider hasn't been initialized yet.
 */
export function getOAuthProvider(): OAuthProxy {
  if (!authProxy) {
    throw new Error(
      "OAuth provider not initialized. Call initializeOAuthProvider() first.",
    );
  }
  return authProxy;
}

/**
 * Initializes the GitHub OAuth provider with the client secret.
 * Must be called before accessing the authProxy.
 */
export async function initializeOAuthProvider(): Promise<OAuthProxy> {
  logger.debug("Fetching GitHub client ID from SSM...");
  const clientId = await authConfig.getGitHubClientId();
  logger.debug(`GitHub client ID retrieved: ${clientId ? "✓" : "✗ (empty)"}`);

  logger.debug("Fetching GitHub client secret from SSM...");
  const clientSecret = await authConfig.getGitHubClientSecret();
  logger.debug(
    `GitHub client secret retrieved: ${clientSecret ? "✓" : "✗ (empty)"}`,
  );

  logger.debug("Creating GitHubProvider instance...");

  authProxy = new OAuthProxy({
    baseUrl: authConfig.MCP_SERVER_URL,
    encryptionKey: await authConfig.getEncryptionSecret(),
    jwtSigningKey:
      (await authConfig.getJWTSecret()) || "change-me-in-production",
    scopes: ["user"],
    tokenStorage: new DynamoDBStore({
      region: region,
      tableName: authConfig.TOKENS_DYNAMODB_TABLE_NAME || "oauth-tokens",
    }),
    upstreamAuthorizationEndpoint: "https://github.com/login/oauth/authorize",
    upstreamClientId: clientId,
    upstreamClientSecret: clientSecret,
    upstreamTokenEndpoint: "https://github.com/login/oauth/access_token",
  });

  logger.debug("GitHubProvider instance created");

  return authProxy;
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
  const jwtIssuer = new JWTIssuer({
    audience: authConfig.MCP_SERVER_URL, // https://api.dx.pagopa.it
    issuer: authConfig.MCP_SERVER_URL,
    signingKey: (await authConfig.getJWTSecret()) || "change-me-in-production",
  });
  const authHeader = request.headers["authorization"];

  // If the token is missing, return undefined to indicate unauthenticated request
  // This will start the OAuth flow when accessing protected resources
  if (!authHeader?.startsWith("Bearer ")) {
    logger.debug("No token, returning undefined for 401 response");
    return undefined;
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  logger.debug(`[Authenticate] Token received, starting verification...`);
  let upstreamToken = null;

  // If the token is a GitHub token, skip JWT validation
  if (token.startsWith("gh")) {
    upstreamToken = token;
    logger.debug(
      "[Authenticate] Token is a GitHub token, skipping JWT validation.",
    );
  } else {
    // Validate JWT token
    const validationResult = await jwtIssuer.verify(token);

    // If invalid, return undefined to indicate unauthenticated request
    if (!validationResult.valid) {
      logger.debug(
        `[Authenticate] Token validation failed: ${validationResult.error}`,
      );
      return undefined;
    }

    // Extract GitHub token from storage
    upstreamToken = (await authProxy.loadUpstreamTokens(token))?.accessToken;
  }

  const isMember = await verifyGithubUser(upstreamToken || "").catch(
    (error) => {
      logger.error("Error verifying GitHub user during OAuth flow", { error });
      return undefined;
    },
  );

  if (!isMember) {
    logger.warn("GitHub user is not a member of the required organizations");
    return undefined;
  }

  return {
    authenticated: true,
    token: upstreamToken ?? null,
  };
}
