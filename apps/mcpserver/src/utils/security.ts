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
  RATE_LIMIT_MAX_REQUESTS: z.number().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z
    .number()
    .positive()
    .default(15 * 60 * 1000), // 15 minutes
});

/**
 * Security configuration
 */
export const securityConfigLocal = SecurityConfigSchema.parse({
  ALLOWED_ORIGINS: securityConfig.ALLOWED_ORIGINS?.split(",") ?? [],
  CORS_MAX_AGE: 86400, // 24 hours
  MAX_REQUEST_SIZE: securityConfig.MAX_REQUEST_SIZE_BYTES,
  RATE_LIMIT_MAX_REQUESTS: securityConfig.RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS: securityConfig.RATE_LIMIT_WINDOW_MS,
});

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  isAllowed(
    identifier: string,
    windowMs: number,
    maxRequests: number,
  ): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

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
 * Gets client identifier for rate limiting
 */
export function getClientIdentifier(req: any): string {
  return (
    req.socket?.remoteAddress || req.headers["x-forwarded-for"] || "unknown"
  );
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
