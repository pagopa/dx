import { z } from "zod/v4";

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

const configSchema = z.object({
  ENCRYPTION_SECRET_SSM_PARAM: z.string().nonempty(),
  GITHUB_CLIENT_ID_SSM_PARAM: z.string().nonempty(),
  GITHUB_CLIENT_SECRET_SSM_PARAM: z.string().nonempty(),
  JWT_SECRET_SSM_PARAM: z.string().nonempty(),
  MCP_AUTH_TYPE: z.enum(["pat", "oauth"]),
  MCP_SERVER_URL: z.url(),
  TOKENS_DYNAMODB_TABLE_NAME: z.string().nonempty(),
});

export async function getConfig() {
  const config = configSchema.parse(process.env);
  return {
    ENCRYPTION_SECRET: await getSecureParameter(
      config.ENCRYPTION_SECRET_SSM_PARAM,
    ),
    GITHUB_CLIENT_ID: await getSecureParameter(
      config.GITHUB_CLIENT_ID_SSM_PARAM,
    ),
    GITHUB_CLIENT_SECRET: await getSecureParameter(
      config.GITHUB_CLIENT_SECRET_SSM_PARAM,
    ),
    JWT_SECRET: await getSecureParameter(config.JWT_SECRET_SSM_PARAM),
    MCP_AUTH_TYPE: config.MCP_AUTH_TYPE,
    MCP_SERVER_URL: config.MCP_SERVER_URL,
    TOKENS_DYNAMODB_TABLE_NAME: config.TOKENS_DYNAMODB_TABLE_NAME,
  };
}
