/**
 * Zod schema for the CLI environment variables.
 *
 * All access to `process.env` happens in the entrypoint (`src/index.ts`),
 * which parses the raw environment once and passes the validated result as
 * `CliEnv` to every command. This keeps env-var reads out of use-cases and
 * adapters and makes them fully testable.
 */
import { z } from "zod";

export const cliEnvSchema = z
  .object({
    // Standard CI marker. Presence (any string value) signals an automated
    // pipeline where interactive prompts must not block. Follows the same
    // convention used by `is-interactive` and `ora`.
    CI: z.string().optional(),
  })
  .passthrough();

export type CliEnv = z.infer<typeof cliEnvSchema>;
