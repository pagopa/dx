/**
 * Security Utilities
 *
 * This module provides security utilities for the MCP server including:
 * - CORS origin validation
 * - Request size limits
 * - HTTPS enforcement
 * - Configuration validation
 *
 * Security features:
 * - Configurable allowed origins for CORS
 * - Development mode supports localhost
 * - Max request size enforcement
 * - Type-safe configuration with Zod
 *
 * @module utils/security
 */

import { z } from "zod";

import { securityConfig } from "../config/security.js";

/**
 * Security configuration schema
 *
 * Validates security-related environment variables and provides defaults
 */
export const SecurityConfigSchema = z.object({
  ALLOWED_ORIGINS: z.array(z.string().url()).default([]),
  CORS_MAX_AGE: z.number().positive().default(86400), // 24 hours
  MAX_REQUEST_SIZE: z
    .number()
    .positive()
    .default(1024 * 1024), // 1MB
});

/**
 * Security configuration
 */
export const securityConfigLocal = SecurityConfigSchema.parse({
  ALLOWED_ORIGINS: securityConfig.ALLOWED_ORIGINS?.split(",") ?? [],
  CORS_MAX_AGE: 86400, // 24 hours
  MAX_REQUEST_SIZE: securityConfig.MAX_REQUEST_SIZE_BYTES,
});

/**
 * Asserts that a value is defined (throws if undefined)
 */
export function assertDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Asserts that a value is not null (throws if null)
 */
export function assertNotNull<T>(value: null | T, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

/**
 * Validates CORS origin against allowed list
 *
 * This function implements a flexible CORS validation strategy:
 * - In production: checks against explicitly configured allowed origins
 * - In development: allows localhost when no specific origins are configured
 *
 * Security considerations:
 * - Always configure ALLOWED_ORIGINS in production
 * - Localhost is only allowed when ALLOWED_ORIGINS is empty
 * - Invalid URLs are rejected
 *
 * @param origin - The Origin header value from the HTTP request
 * @returns true if origin is allowed, false otherwise
 *
 * @example
 * // Production with configured origins
 * isOriginAllowed('https://app.example.com') // true if in ALLOWED_ORIGINS
 *
 * @example
 * // Development without configured origins
 * isOriginAllowed('http://localhost:3000') // true
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // If specific origins are configured, check against the allowlist
  // This is the preferred mode for production environments
  if (securityConfigLocal.ALLOWED_ORIGINS.length > 0) {
    return securityConfigLocal.ALLOWED_ORIGINS.includes(origin);
  }

  // In development mode (no ALLOWED_ORIGINS configured), allow localhost origins
  // This provides convenience during local development
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("localhost:")
    );
  } catch {
    // Invalid URL format
    return false;
  }
}
