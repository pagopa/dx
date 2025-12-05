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
 * GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET can be provided via:
 * - Direct environment variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * - AWS SSM Parameter Store: Set GITHUB_CLIENT_ID_SSM_PARAM and/or GITHUB_CLIENT_SECRET_SSM_PARAM with the parameter names
 */

const MCP_AUTH_TYPE = process.env.MCP_AUTH_TYPE?.toLowerCase() || "oauth";
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:8080";

/**
 * Retrieves the GitHub client ID from either:
 * 1. SSM Parameter Store (if GITHUB_CLIENT_ID_SSM_PARAM is set)
 * 2. Environment variable GITHUB_CLIENT_ID
 *
 * @returns Promise that resolves to the GitHub client ID
 */
async function getGitHubClientId(): Promise<string> {
  return getSecureValue(
    process.env.GITHUB_CLIENT_ID_SSM_PARAM,
    "GITHUB_CLIENT_ID",
  );
}

/**
 * Retrieves the GitHub client secret from either:
 * 1. SSM Parameter Store (if GITHUB_CLIENT_SECRET_SSM_PARAM is set)
 * 2. Environment variable GITHUB_CLIENT_SECRET
 *
 * @returns Promise that resolves to the GitHub client secret
 */
async function getGitHubClientSecret(): Promise<string> {
  return getSecureValue(
    process.env.GITHUB_CLIENT_SECRET_SSM_PARAM,
    "GITHUB_CLIENT_SECRET",
  );
}

/**
 * Retrieves a secure parameter value from either:
 * 1. SSM Parameter Store (if the SSM parameter name is provided)
 * 2. Environment variable fallback
 *
 * @param ssmParamName - Optional SSM parameter name
 * @param envVarName - Environment variable name to use as fallback
 * @returns Promise that resolves to the parameter value
 */
async function getSecureValue(
  ssmParamName: string | undefined,
  envVarName: string,
): Promise<string> {
  if (ssmParamName) {
    return await getSecureParameter(ssmParamName);
  }

  return process.env[envVarName] || "";
}

export const authConfig = {
  getGitHubClientId,
  getGitHubClientSecret,
  MCP_AUTH_TYPE,
  MCP_SERVER_URL,
};
