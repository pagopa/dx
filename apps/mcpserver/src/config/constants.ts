/**
 * Server constants and configuration values
 */

/** Maximum response size in characters before truncation */
export const CHARACTER_LIMIT = 25000;

/** Timeout for API requests in milliseconds */
export const API_TIMEOUT = 30000;

/** Maximum number of results to return */
export const MAX_RESULTS = 100;

/** Default page size for paginated results */
export const DEFAULT_PAGE_SIZE = 20;

/** Message when response is truncated */
export const TRUNCATION_MESSAGE =
  "Response truncated due to size limits. Use filters or pagination to narrow results.";
