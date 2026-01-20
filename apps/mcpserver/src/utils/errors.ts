import { z } from "zod";

/**
 * Formats a list of Zod issues into a single, human-readable string.
 * This is useful for error messages when configuration or input validation fails.
 *
 * @param issues - The array of Zod issues to format
 * @returns A semicolon-separated string of formatted issues
 */
export function formatZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}
