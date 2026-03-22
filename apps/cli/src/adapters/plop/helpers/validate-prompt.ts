// Shared prompt validation helper for plop generators.
// Bridges Zod schema validation with Inquirer's validate callback signature,
// returning a human-readable error string on failure or true on success.
import { z } from "zod/v4";

/**
 * Creates an Inquirer-compatible validate function from a Zod schema.
 * Applies any transforms defined in the schema before validating,
 * so the same rules are enforced at both the prompt and domain levels.
 */
export const validatePrompt =
  (schema: z.ZodSchema) =>
  (input: unknown): string | true => {
    const error = schema.safeParse(input).error;
    return error ? z.prettifyError(error) : true;
  };
