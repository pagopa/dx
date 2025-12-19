import { z } from "zod/v4";

import { createSsmClient, getSecureParameter } from "../utils/ssm.js";
import { region as awsRegion } from "./aws.js";

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

const configSchema = z.object({
  GITHUB_CLIENT_ID_SSM_PARAM: z.string().nonempty(),
  GITHUB_CLIENT_SECRET_SSM_PARAM: z.string().nonempty(),
  MCP_AUTH_TYPE: z.enum(["pat", "oauth"]),
  MCP_SERVER_URL: z.url(),
});

const ssmClient = createSsmClient(awsRegion);
const fetchSecureParameter = getSecureParameter(ssmClient, {
  region: awsRegion,
});

/**
 * Resolves authentication configuration for the MCP server from environment and AWS SSM.
 * @returns OAuth/PAT configuration including GitHub credentials, auth type, and server URL.
 */
export async function getConfig() {
  const config = configSchema.parse(process.env);
  return {
    GITHUB_CLIENT_ID: await fetchSecureParameter(
      config.GITHUB_CLIENT_ID_SSM_PARAM,
    ),
    GITHUB_CLIENT_SECRET: await fetchSecureParameter(
      config.GITHUB_CLIENT_SECRET_SSM_PARAM,
    ),
    MCP_AUTH_TYPE: config.MCP_AUTH_TYPE,
    MCP_SERVER_URL: config.MCP_SERVER_URL,
  };
}
