import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { z } from "zod";

import { getConfig } from "../config/auth.js";
import { verifyGithubUser } from "./github.js";

// Zod schemas for validation
const OAuthRegisterSchema = z.object({
  client_name: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  redirect_uris: z.array(z.string().url()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});

const OAuthAuthorizeSchema = z.object({
  client_id: z.string().min(1),
  code_challenge: z.string().min(43).max(128).optional(),
  code_challenge_method: z.enum(["S256", "plain"]).optional(),
  redirect_uri: z.string().url(),
  response_type: z.literal("code"),
  scope: z.string().optional(),
  state: z.string().optional(),
});

const OAuthTokenSchema = z.object({
  client_id: z.string().min(1),
  code: z.string().min(1),
  code_verifier: z.string().min(43).max(128).optional(),
  grant_type: z.literal("authorization_code"),
  redirect_uri: z.string().url(),
  state: z.string().optional(), // Internal state for PKCE lookup
});

const logger = getLogger(["mcpserver", "oauth"]);

const authConfig = await getConfig();

/**
 * OAuth configuration for GitHub with PKCE support
 */
export const oauthConfig = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  clientId: authConfig.GITHUB_CLIENT_ID,
  clientSecret: authConfig.GITHUB_CLIENT_SECRET,
  scopes: ["user:email", "read:user"],
  tokenEndpoint: "https://github.com/login/oauth/access_token",
} as const;

/**
 * In-memory store for PKCE challenges (in production, use Redis/database)
 * Maps authorization code to PKCE data
 */
const pkceStore = new Map<
  string,
  {
    codeChallenge: string;
    codeChallengeMethod: "plain" | "S256";
    expiresAt: number;
  }
>();

/**
 * Gets OAuth authorization server metadata for MCP discovery
 */
export function getOAuthMetadata(serverUrl: string) {
  return {
    authorization_endpoint: `${serverUrl}/oauth/authorize`,
    code_challenge_methods_supported: ["S256", "plain"],
    grant_types_supported: ["authorization_code"],
    issuer: serverUrl,
    response_types_supported: ["code"],
    scopes_supported: oauthConfig.scopes,
    token_endpoint: `${serverUrl}/oauth/token`,
  };
}

/**
 * Gets OAuth 2.0 Resource Server Metadata (RFC 8707)
 */
export function getOAuthProtectedResourceMetadata(serverUrl: string) {
  return {
    authorization_servers: [serverUrl],
    bearer_methods_supported: ["header"],
    resource: serverUrl,
    resource_documentation: `${serverUrl}/docs`,
    scopes_supported: oauthConfig.scopes,
  };
}

/**
 * Handles OAuth authorization request with PKCE support
 */
export async function handleOAuthAuthorize(
  params: URLSearchParams,
): Promise<string> {
  // Convert URLSearchParams to object, converting null to undefined for Zod
  const paramsObj = {
    client_id: params.get("client_id") || undefined,
    code_challenge: params.get("code_challenge") || undefined,
    code_challenge_method: params.get("code_challenge_method") || undefined,
    redirect_uri: params.get("redirect_uri") || undefined,
    response_type: params.get("response_type") || undefined,
    scope: params.get("scope") || undefined,
    state: params.get("state") || undefined,
  };

  const validatedParams = OAuthAuthorizeSchema.parse(paramsObj);

  const { code_challenge, code_challenge_method, redirect_uri, scope, state } =
    validatedParams;

  // Use client-provided state as the key for PKCE storage, or generate one if not provided
  const pkceKey = state || randomUUID();

  // Store PKCE data if provided (PKCE is required for security)
  if (code_challenge) {
    pkceStore.set(pkceKey, {
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method ?? "plain",
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
  }

  // Build GitHub authorization URL
  const githubAuthUrl = new URL(oauthConfig.authorizationEndpoint);
  githubAuthUrl.searchParams.set("client_id", oauthConfig.clientId);
  githubAuthUrl.searchParams.set("redirect_uri", redirect_uri);
  githubAuthUrl.searchParams.set(
    "scope",
    scope ?? oauthConfig.scopes.join(" "),
  );
  githubAuthUrl.searchParams.set("state", pkceKey); // Use the same state for GitHub

  logger.debug(
    `Redirecting to GitHub OAuth with PKCE: ${githubAuthUrl.toString()}`,
  );
  return githubAuthUrl.toString();
}

/**
 * Handles Dynamic Client Registration (DCR) - RFC 7591
 */
export async function handleOAuthRegister(
  body: unknown,
): Promise<Record<string, unknown>> {
  const validatedBody = OAuthRegisterSchema.parse(body);

  // Generate secure client credentials
  const clientId = randomUUID();
  const clientSecret = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  return {
    client_id: clientId,
    client_id_issued_at: now,
    client_name: validatedBody.client_name,
    client_secret: clientSecret,
    client_secret_expires_at: 0, // never expires
    grant_types: validatedBody.grant_types ?? ["authorization_code"],
    redirect_uris: validatedBody.redirect_uris,
    response_types: validatedBody.response_types ?? ["code"],
    token_endpoint_auth_method:
      validatedBody.token_endpoint_auth_method ?? "client_secret_post",
  };
}

/**
 * Handles OAuth token exchange with PKCE validation
 */
export async function handleOAuthToken(
  body: unknown,
): Promise<{ access_token: string; scope: string; token_type: string }> {
  const validatedBody = OAuthTokenSchema.parse(body);
  const { code, code_verifier, redirect_uri, state } = validatedBody;

  logger.debug(
    "Exchanging authorization code for access token with PKCE validation",
  );

  // Validate PKCE if code_verifier provided
  if (code_verifier && state && !validatePKCE(state, code_verifier)) {
    throw new Error("Invalid PKCE code verifier");
  }

  // Clean up PKCE data
  if (state) {
    pkceStore.delete(state);
  }

  // Exchange code for token with GitHub
  const response = await fetch(oauthConfig.tokenEndpoint, {
    body: new URLSearchParams({
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      code,
      redirect_uri,
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

  // Validate required fields
  if (!data.access_token || !data.token_type) {
    throw new Error("Invalid token response from GitHub");
  }

  return {
    access_token: data.access_token,
    scope: data.scope ?? oauthConfig.scopes.join(" "),
    token_type: data.token_type,
  };
}

/**
 * Creates a code challenge from verifier using S256 method
 */
function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest("base64url");
  return hash;
}

/**
 * Generates a cryptographically secure random string for PKCE
 */
function generateCodeVerifier(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

/**
 * Validates PKCE code verifier against stored challenge
 */
function validatePKCE(state: string, codeVerifier: string): boolean {
  const pkceData = pkceStore.get(state);
  if (!pkceData) return false;

  // Check expiration (5 minutes)
  if (Date.now() > pkceData.expiresAt) {
    pkceStore.delete(state);
    return false;
  }

  const expectedChallenge =
    pkceData.codeChallengeMethod === "S256"
      ? generateCodeChallenge(codeVerifier)
      : codeVerifier;

  return expectedChallenge === pkceData.codeChallenge;
}
