/**
 * Utility for parsing endpoint keys that may contain HTTP methods.
 * Supports both "METHOD /path" and "/path" formats for backward compatibility.
 */

/**
 * Result of parsing an endpoint key.
 */
export interface ParsedEndpoint {
  /** Whether the key contained a method prefix */
  hasMethod: boolean;
  /** HTTP method (GET, POST, etc.) if present in the key */
  method: string;
  /** URL path component */
  path: string;
}

/**
 * Parses an endpoint key to extract method and path components.
 * Supports "METHOD /path" format (e.g., "GET /users") and plain "/path" format.
 *
 * @param endpoint - Endpoint key string, either "METHOD /path" or "/path"
 * @returns Parsed endpoint with method, path, and hasMethod flag
 *
 * @example
 * ```typescript
 * parseEndpointKey("GET /users")
 * // { method: "GET", path: "/users", hasMethod: true }
 *
 * parseEndpointKey("/users")
 * // { method: "", path: "/users", hasMethod: false }
 * ```
 */
export function parseEndpointKey(endpoint: string): ParsedEndpoint {
  const spaceIndex = endpoint.indexOf(" ");
  const hasMethod = spaceIndex > 0;

  if (hasMethod) {
    return {
      hasMethod: true,
      method: endpoint.substring(0, spaceIndex),
      path: endpoint.substring(spaceIndex + 1),
    };
  }

  return {
    hasMethod: false,
    method: "",
    path: endpoint,
  };
}
