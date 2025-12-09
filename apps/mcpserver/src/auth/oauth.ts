import { getLogger } from "@logtape/logtape";
import { GitHubProvider } from "fastmcp/auth";

import { authConfig } from "../config/auth.js";

const logger = getLogger(["mcpserver", "oauth"]);

let authProxy: GitHubProvider;

/**
 * Gets the initialized OAuth provider.
 * @throws Error if the provider hasn't been initialized yet.
 */
export function getOAuthProvider(): GitHubProvider {
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
export async function initializeOAuthProvider(): Promise<GitHubProvider> {
  logger.debug("Fetching GitHub client ID from SSM...");
  const clientId = await authConfig.getGitHubClientId();
  logger.debug(`GitHub client ID retrieved: ${clientId ? "✓" : "✗ (empty)"}`);

  logger.debug("Fetching GitHub client secret from SSM...");
  const clientSecret = await authConfig.getGitHubClientSecret();
  logger.debug(
    `GitHub client secret retrieved: ${clientSecret ? "✓" : "✗ (empty)"}`,
  );

  logger.debug("Creating GitHubProvider instance...");
  authProxy = new GitHubProvider({
    baseUrl: authConfig.MCP_SERVER_URL,
    clientId,
    clientSecret,
    scopes: [],
  });
  logger.debug("GitHubProvider instance created");

  return authProxy;
}
