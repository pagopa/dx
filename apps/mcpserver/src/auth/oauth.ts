import { GitHubProvider } from "fastmcp/auth";

import { authConfig } from "../config/auth.js";

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
  const clientSecret = await authConfig.getGitHubClientSecret();

  authProxy = new GitHubProvider({
    baseUrl: authConfig.MCP_SERVER_URL,
    clientId: authConfig.GITHUB_CLIENT_ID,
    clientSecret,
    scopes: [],
  });

  return authProxy;
}
