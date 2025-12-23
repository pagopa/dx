import { z } from "zod";

import { securityConfig } from "../config/security.js";

/**
 * Security configuration schema
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
 * Validates CORS origin
 * In development, allows localhost origins when no specific origins are configured
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // If specific origins are configured, check against the allowlist
  if (securityConfigLocal.ALLOWED_ORIGINS.length > 0) {
    return securityConfigLocal.ALLOWED_ORIGINS.includes(origin);
  }

  // In development, allow localhost origins
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("localhost:")
    );
  } catch {
    return false;
  }
}
