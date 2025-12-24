/**
 * Utility for normalizing endpoint keys in configuration overrides.
 * Converts "METHOD /path" format to "/path" keys with method in the value object.
 */

interface EndpointConfig {
  [key: string]: unknown;
  method?: string;
}

/**
 * Normalizes endpoint overrides to support "METHOD /path" format.
 * Converts keys like "GET /users" to "/users" with method: "GET" in the value.
 *
 * @param endpoints - Record of endpoint keys to configuration objects
 * @returns Normalized endpoints record with path-only keys
 *
 * @example
 * ```typescript
 * const input = {
 *   "GET /users": { availability_threshold: 95 },
 *   "/posts": { availability_threshold: 98 }
 * };
 *
 * const output = normalizeEndpointKeys(input);
 * // {
 * //   "/users": { method: "GET", availability_threshold: 95 },
 * //   "/posts": { availability_threshold: 98 }
 * // }
 * ```
 */
export function normalizeEndpointKeys<T extends EndpointConfig>(
  endpoints: Record<string, T>,
): Record<string, T> {
  const normalized: Record<string, T> = {};

  for (const [key, value] of Object.entries(endpoints)) {
    // Check if key has "METHOD /path" format
    const spaceIndex = key.indexOf(" ");
    if (spaceIndex > 0) {
      // Extract method and path
      const method = key.substring(0, spaceIndex);
      const path = key.substring(spaceIndex + 1);

      // Only add as path-only key with method in the value
      // Don't set props.path to avoid duplicating basePath in query functions
      // This allows the "METHOD /path" override to match "/path" base
      normalized[path] = {
        ...value,
        method,
      } as T;
    } else {
      // Keep path-only overrides as is
      normalized[key] = value;
    }
  }

  return normalized;
}
