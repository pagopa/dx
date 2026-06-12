/**
 * Shared Commander failure handling used by command actions.
 */
import type { Command } from "commander";

import type { CommandPresenter } from "../../domain/command-presenter.js";

import { formatErrorDetailed, toErrorMessage } from "./error-reporting.js";
import { isVerbose } from "./global-options.js";
import { JsonCommandPresenter } from "./presenters/json-command-presenter.js";

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

/**
 * Casts an unknown thrown value to an Error instance with a descriptive
 * message, preserving the original value as the cause.
 *
 * Use as the error-mapper argument for `ResultAsync.fromPromise`.
 */
export const asError =
  (message: string) =>
  (cause: unknown): Error =>
    new Error(message, { cause });

/**
 * Builds an error handler for command actions that selects the appropriate
 * reporting strategy based on the requested output mode.
 *
 * - In JSON mode the error is written to the presenter and the process exit
 *   code is set to 1 (so the caller can return cleanly without throwing).
 * - In text mode Commander's `command.error()` is used, which prints a
 *   human-readable message and exits immediately.
 */
export const reportCommandError =
  (command: Command, presenter: CommandPresenter) =>
  (error: Error): void => {
    if (presenter instanceof JsonCommandPresenter) {
      presenter.reportError(error);
      process.exitCode = 1;
    } else {
      exitWithError(command)(error);
    }
  };
