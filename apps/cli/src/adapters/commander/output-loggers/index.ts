import type { OutputLogger } from "../../../domain/output-logger.js";
/**
 * Output logger factory.
 *
 * isNonInteractive determines whether the CLI should suppress interactive
 * prompts (e.g. when running in a CI pipeline). This is independent of the
 * output format: a user can request JSON output while still answering prompts,
 * and a CI system can set CI=true with text output.
 *
 * createOutputLogger selects the appropriate OutputLogger adapter based solely
 * on the requested output format.
 */
import type { CliEnv } from "../env.js";

import { JsonOutputLogger } from "./json.js";
import { TextOutputLogger } from "./text.js";

/**
 * Returns true when the CLI should suppress interactive prompts.
 *
 * Triggered by the presence of the CI environment variable (any value),
 * following the same convention used by `is-interactive` and `ora`.
 */
export const isNonInteractive = (env: CliEnv): boolean => env.CI !== undefined;

/**
 * Returns the appropriate OutputLogger adapter for the requested output mode.
 *
 * - "text" → TextOutputLogger (chalk + ora, for human terminal sessions)
 * - "json" → JsonOutputLogger (NDJSON on stderr, JSON envelope on stdout)
 */
export const createOutputLogger = (output: "json" | "text"): OutputLogger =>
  output === "json" ? new JsonOutputLogger() : new TextOutputLogger();
