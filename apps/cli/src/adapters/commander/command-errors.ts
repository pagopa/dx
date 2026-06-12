/**
 * Shared Commander failure handling used by command actions.
 */
import type { Command } from "commander";

import { formatErrorDetailed, toErrorMessage } from "./error-reporting.js";
import { isVerbose } from "./global-options.js";

/**
 * Builds a failure handler that ends the command via Commander's
 * `Command#error`, with an output tailored to the active verbosity.
 *
 * - In normal mode, a single meaningful line is printed.
 * - When `--verbose` is active, the full cause chain and stack trace are
 *   included so users can diagnose the underlying failure.
 */
export const exitWithError =
  (command: Command) =>
  (error: unknown): never => {
    const message = isVerbose(command)
      ? formatErrorDetailed(error)
      : toErrorMessage(error);
    command.error(message);
  };
