/**
 * Template utilities for TypeScript template literals.
 * Domain-specific helper functions.
 */

/**
 * Convert URI path with parameters to regex pattern.
 * Replaces path parameters like {id} with regex patterns.
 *
 * @param uri - URI path with parameters in curly braces
 * @returns Regex pattern string
 *
 * @example
 * uriToRegex("/api/{id}/items/{itemId}")
 * // => "/api/[^/]+/items/[^/]+$"
 */
export function uriToRegex(uri: string): string {
  return uri.replace(/\{[^/]+\}/g, "[^/]+") + "$";
}
