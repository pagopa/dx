import type { CommandPresenter } from "../../../domain/command-presenter.js";
/**
 * Output logger factory.
 *
 * isNonInteractive determines whether the CLI should suppress interactive
 * prompts (e.g. when running in a CI pipeline). This is independent of the
 * output format: a user can request JSON output while still answering prompts,
 * and a CI system can set CI=true with text output.
 *
 * createCommandPresenter selects the appropriate CommandPresenter adapter based
 * solely on the requested output mode, while resolveOutputMode applies the
 * precedence rules that decide that mode.
 */
import type { CliEnv } from "../env.js";
import type { GlobalOptions } from "../global-options.js";

import { JsonCommandPresenter } from "./json-command-presenter.js";
import { TextCommandPresenter } from "./text-command-presenter.js";

/**
 * Returns true when the CLI should suppress interactive prompts.
 *
 * Checks the parsed CI boolean from CliEnv (coerced by zod's stringbool),
 * following the same convention used by `is-interactive` and `ora`.
 */
export const isNonInteractive = (env: CliEnv): boolean => env.CI;

/**
 * Resolves the effective output mode for a command invocation.
 *
 * - In a non-interactive environment (CI), output is always "json" so agents
 *   and pipelines get structured output regardless of the `--output` flag.
 * - Otherwise the `--output` flag decides.
 * - When nothing is provided, the mode defaults to "text".
 */
export const resolveOutputMode = (
  env: CliEnv,
  output: GlobalOptions["output"] | undefined,
): "json" | "text" => {
  if (isNonInteractive(env)) {
    return "json";
  }
  return output === "json" ? "json" : "text";
};

/**
 * Returns the appropriate CommandPresenter adapter for the requested output mode.
 *
 * - "text" → TextCommandPresenter (chalk + ora, for human terminal sessions)
 * - "json" → JsonCommandPresenter (NDJSON on stderr, JSON envelope on stdout)
 */
export const createCommandPresenter = (
  output: "json" | "text",
): CommandPresenter =>
  output === "json" ? new JsonCommandPresenter() : new TextCommandPresenter();
