import { randomUUID } from "crypto";
/**
 * Handles Dynamic Client Registration (DCR) - RFC 7591
 * Accetta client metadata, restituisce client_id e client_secret
 */
export async function handleOAuthRegister(
  body: any,
): Promise<Record<string, unknown>> {
  // In una vera implementazione, qui si validerebbe il body secondo RFC 7591
  // e si salverebbe il client in un database. Qui generiamo valori dummy.
  const clientId = randomUUID();
  const clientSecret = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: now,
    client_secret_expires_at: 0, // never expires
    ...body,
    grant_types: body.grant_types || ["authorization_code"],
    response_types: body.response_types || ["code"],
    token_endpoint_auth_method:
      body.token_endpoint_auth_method || "client_secret_post",
  };
}
import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";

import type { AuthenticationStatus } from "../types.js";

import { getConfig } from "../config/auth.js";
import { verifyGithubUser } from "./github.js";

const logger = getLogger(["mcpserver", "oauth"]);

const authConfig = await getConfig();

/**
 * OAuth configuration for GitHub
 */
export const oauthConfig = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  clientId: authConfig.GITHUB_CLIENT_ID,
  clientSecret: authConfig.GITHUB_CLIENT_SECRET,
  scopes: ["user"],
  tokenEndpoint: "https://github.com/login/oauth/access_token",
};

/**
 * Gets OAuth authorization server metadata for MCP discovery
 * Note: These endpoints point to the proxy server, not directly to GitHub
 */
export function getOAuthMetadata(serverUrl: string) {
  return {
    authorization_endpoint: `${serverUrl}/oauth/authorize`,
    grant_types_supported: ["authorization_code"],
    issuer: serverUrl,
    response_types_supported: ["code"],
    scopes_supported: oauthConfig.scopes,
    token_endpoint: `${serverUrl}/oauth/token`,
  };
}

/**
 * Gets OAuth 2.0 Resource Server Metadata (RFC 8707)
 * Provides information about this protected resource and how to access it
 */
export function getOAuthProtectedResourceMetadata(serverUrl: string) {
  return {
    resource: serverUrl,
    authorization_servers: [serverUrl],
    scopes_supported: oauthConfig.scopes,
    bearer_methods_supported: ["header"],
    resource_documentation: `${serverUrl}/docs`,
  };
}

/**
 * Handles OAuth authorization request - proxies to GitHub with server's client_id
 */
export async function handleOAuthAuthorize(
  params: URLSearchParams,
): Promise<string> {
  const state = params.get("state");
  const redirectUri = params.get("redirect_uri");
  const scope = params.get("scope") || oauthConfig.scopes.join(" ");

  if (!redirectUri) {
    throw new Error("redirect_uri is required");
  }

  // Build GitHub authorization URL with server's client_id
  const githubAuthUrl = new URL(oauthConfig.authorizationEndpoint);
  githubAuthUrl.searchParams.set("client_id", oauthConfig.clientId);
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("scope", scope);
  if (state) {
    githubAuthUrl.searchParams.set("state", state);
  }

  logger.debug(`Redirecting to GitHub OAuth: ${githubAuthUrl.toString()}`);
  return githubAuthUrl.toString();
}

/**
 * Handles OAuth token exchange - proxies to GitHub with server's credentials
 */
export async function handleOAuthToken(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; token_type: string; scope: string }> {
  logger.debug("Exchanging authorization code for access token");

  // Exchange code for token with GitHub using server's credentials
  const response = await fetch(oauthConfig.tokenEndpoint, {
    body: new URLSearchParams({
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`GitHub token exchange failed: ${error}`);
    throw new Error(`Failed to exchange authorization code: ${error}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
    scope?: string;
    token_type?: string;
  };

  if (data.error) {
    logger.error(
      `GitHub OAuth error: ${data.error} - ${data.error_description}`,
    );
    throw new Error(`OAuth error: ${data.error}`);
  }

  if (!data.access_token) {
    throw new Error("No access token returned from GitHub");
  }

  logger.debug("Successfully exchanged code for access token");
  return {
    access_token: data.access_token,
    scope: data.scope || "",
    token_type: data.token_type || "bearer",
  };
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
