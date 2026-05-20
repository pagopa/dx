/**
 * Output logger factory.
 *
 * isAgenticMode determines whether the CLI should operate in non-interactive
 * (agentic) mode. createOutputLogger will be introduced alongside
 * JsonOutputLogger in the next PR.
 */
import type { CliEnv } from "../env.js";

/**
 * Returns true when the CLI should operate in agentic (non-interactive) mode.
 *
 * Agentic mode is triggered when:
 * - `CI` is set to any value (signals an automated pipeline — presence is the
 *   signal, not the value; follows the same convention used by `is-interactive`
 *   and `ora`)
 * - `--output=json` is passed (explicit structured output request)
 */
export const isAgenticMode = (env: CliEnv, output: "json" | "text"): boolean =>
  env.CI !== undefined || output === "json";
