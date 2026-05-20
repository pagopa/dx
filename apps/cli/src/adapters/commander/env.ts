/**
 * Zod schema for the CLI environment variables.
 *
 * Intended to centralize env parsing at the entrypoint (`src/index.ts`),
 * which will parse the raw environment once and pass the validated result as
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
  .loose();

export type CliEnv = z.infer<typeof cliEnvSchema>;
