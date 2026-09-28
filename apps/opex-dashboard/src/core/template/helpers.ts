/**
 * Template utilities for TypeScript template literals.
 * Domain-specific helper functions.
 */

/** Regex metacharacters that must be escaped in a literal URI segment. */
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

/**
 * Convert a URI path with parameters to an anchored regex pattern.
 * Replaces path parameters like {id} with a single-segment regex pattern and
 * escapes any other regex metacharacters so the literal path is matched.
 *
 * @param uri - URI path with parameters in curly braces
 * @returns Anchored regex pattern string
 *
 * @example
 * uriToRegex("/api/{id}/items/{itemId}")
 * // => "^/api/[^/]+/items/[^/]+$"
 *
 * @example
 * uriToRegex("/v1/status.json")
 * // => "^/v1/status\\.json$"
 */
export function uriToRegex(uri: string): string {
  const pattern = uri
    .split(/(\{[^/]+\})/)
    .map((part) => (/^\{[^/]+\}$/.test(part) ? "[^/]+" : escapeRegex(part)))
    .join("");

  return `^${pattern}$`;
}

/**
 * Escape regex metacharacters in a literal string.
 */
function escapeRegex(value: string): string {
  return value.replace(REGEX_SPECIAL_CHARS, "\\$&");
}
