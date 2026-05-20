import type { CommandPresenter } from "../../../domain/command-presenter.js";
/**
 * Output logger factory.
 *
 * isNonInteractive determines whether the CLI should suppress interactive
 * prompts (e.g. when running in a CI pipeline). This is independent of the
 * output format: a user can request JSON output while still answering prompts,
 * and a CI system can set CI=true with text output.
 *
 * createCommandPresenter selects the appropriate CommandPresenter adapter based solely
 * on the requested output format.
 */
import type { CliEnv } from "../env.js";

import { JsonCommandPresenter } from "./json-command-presenter.js";
import { TextCommandPresenter } from "./text-command-presenter.js";

/**
 * Returns true when the CLI should suppress interactive prompts.
 *
 * Triggered by the presence of the CI environment variable (any value),
 * following the same convention used by `is-interactive` and `ora`.
 */
export const isNonInteractive = (env: CliEnv): boolean => env.CI !== undefined;

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
