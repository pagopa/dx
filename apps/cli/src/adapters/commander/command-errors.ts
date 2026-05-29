/**
 * Shared Commander error helpers used by individual commands.
 * Keeping them separate avoids pulling the full CLI command graph into
 * command unit tests that only need common error handling behavior.
 */
import { Command } from "commander";

import { formatErrorDetailed, toErrorMessage } from "./error-reporting.js";

export type GlobalOptions = {
  output: "json" | "text";
  verbose?: boolean;
};

/**
 * Returns true when the global `--verbose` flag is active on the closest
 * ancestor command that defines it (the root `dx` program in our CLI).
 */
export const isVerbose = (command: Command): boolean =>
  command.optsWithGlobals<GlobalOptions>().verbose === true;

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
