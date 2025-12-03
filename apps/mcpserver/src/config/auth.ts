import { getSecureParameter } from "../utils/ssm.js";

/**
 * Authentication configuration for the MCP server.
 *
 * Determines whether authentication is required based on the
 * MCP_AUTH_TYPE environment variable.
 *
 * Supported values:
 * - "pat": Authentication via GitHub personal access token.
 * - "oauth": OAuth authentication using GitHub.
 *
 * Defaults to "oauth" if not set or invalid.
 *
 * GITHUB_CLIENT_SECRET can be provided via:
 * - Direct environment variable: GITHUB_CLIENT_SECRET
 * - AWS SSM Parameter Store: Set GITHUB_CLIENT_SECRET_SSM_PARAM with the parameter name
 */

const MCP_AUTH_TYPE = process.env.MCP_AUTH_TYPE?.toLowerCase() || "oauth";
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:8080";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";

/**
 * Retrieves the GitHub client secret from either:
 * 1. SSM Parameter Store (if GITHUB_CLIENT_SECRET_SSM_PARAM is set)
 * 2. Environment variable GITHUB_CLIENT_SECRET
 *
 * @returns Promise that resolves to the GitHub client secret
 */
async function getGitHubClientSecret(): Promise<string> {
  const ssmParamName = process.env.GITHUB_CLIENT_SECRET_SSM_PARAM;

  if (ssmParamName) {
    return await getSecureParameter(ssmParamName);
  }

  return process.env.GITHUB_CLIENT_SECRET || "";
}

export const authConfig = {
  getGitHubClientSecret,
  GITHUB_CLIENT_ID,
  MCP_AUTH_TYPE,
  MCP_SERVER_URL,
};
