/**
 * Utilities for sanitizing names to comply with Azure resource naming constraints.
 * Azure resource names cannot contain special characters like [], (), {}, etc.
 */

/**
 * Sanitize a name by removing special characters that are invalid in Azure resource names.
 * Handles: braces {}, brackets [], parentheses (), and other common special chars.
 */
export function sanitizeName(name: string): string {
  // Replace special characters with empty string
  // Azure resource names typically allow alphanumerics, hyphens, and underscores
  return name.replace(/[{}[\]()<>@#$%^&*+=|\\;:'",.?/`~]/g, "");
}
