/**
 * Token Validation Middleware
 *
 * This module provides authentication middleware for validating Bearer tokens
 * and verifying GitHub organization membership.
 *
 * The middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Validates token format
 * 3. Verifies user is member of required GitHub organizations
 * 4. Returns AuthInfo object compatible with MCP SDK
 *
 * @module auth/tokenMiddleware
 */

import type { IncomingMessage } from "http";

import { getLogger } from "@logtape/logtape";

import { verifyGithubUser } from "./github.js";

/**
 * AuthInfo type compatible with MCP SDK
 *
 * This type extends Record<string, unknown> to maintain compatibility with
 * the MCP SDK's type system while providing strongly-typed fields.
 *
 * @property token - GitHub Personal Access Token
 * @property clientId - OAuth client identifier
 * @property scopes - OAuth scopes granted
 * @property extra - Additional metadata (userId, etc.)
 */
export type AuthInfo = Record<string, unknown> & {
  clientId: string;
  extra: { userId: string };
  scopes: string[];
  token: string;
};

const logger = getLogger(["mcpserver", "token-middleware"]);

/**
 * Token validation middleware
 *
 * Authenticates incoming HTTP requests by validating Bearer tokens
 * and checking GitHub organization membership.
 *
 * @param req - Incoming HTTP request with Authorization header
 * @returns AuthInfo object if authentication succeeds, undefined if no auth header present
 * @throws Error if token is invalid or user is not a member of required organizations
 */
export const tokenMiddleware = async (
  req: IncomingMessage,
): Promise<AuthInfo | undefined> => {
  try {
    logger.debug("[tokenMiddleware] Middleware invoked for request", {
      headers: req.headers,
    });

    // Extract Authorization header
    // If missing, return undefined (no authentication attempted)
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logger.warn("[tokenMiddleware] No Authorization header present");
      return undefined; // No authentication
    }

    // Validate Bearer token format (RFC 6750)
    if (!authHeader.startsWith("Bearer ")) {
      logger.warn("[tokenMiddleware] Invalid Authorization header format");
      return undefined;
    }

    // Extract token by removing "Bearer " prefix (7 characters)
    const token = authHeader.slice(7);
    logger.debug("[tokenMiddleware] Token extracted", {
      tokenLength: token.length,
    });

    // Verify user is a member of required GitHub organizations
    // This provides an additional security layer beyond token validation
    logger.debug("[tokenMiddleware] Verifying GitHub organization membership");
    const isMember = await verifyGithubUser(token);
    if (!isMember) {
      logger.warn(
        "[tokenMiddleware] User is not a member of required organizations",
      );
      throw new Error("User is not a member of required organizations");
    }

    logger.debug("[tokenMiddleware] Membership verified, returning authInfo");

    // Return AuthInfo object compatible with MCP SDK
    // This object will be available as extra.authInfo in tool handlers
    return {
      clientId: "mcp-client",
      extra: { userId: "github-user" },
      scopes: ["default"],
      token,
    };
  } catch (error) {
    logger.error("[tokenMiddleware] Errore dettagliato", {
      error: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack,
    });
    throw error;
  }
};
