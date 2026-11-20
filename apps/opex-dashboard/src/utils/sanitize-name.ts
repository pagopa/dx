/**
 * Utilities for sanitizing names to comply with Azure resource naming constraints.
 * Azure resource names (e.g. Portal dashboards) only allow alphanumeric
 * characters, hyphens and underscores.
 */

/**
 * Sanitize a name so it is a valid Azure resource name segment.
 * Replaces every character outside `[A-Za-z0-9_-]` with a single underscore.
 *
 * @param name - Raw name coming from the configuration
 * @returns Sanitized name containing only `[A-Za-z0-9_-]`
 *
 * @example
 * ```ts
 * sanitizeName("PROD-IO/IO_App.Availability") // "PROD-IO_IO_App_Availability"
 * ```
 */
export function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]+/g, "_");
}
