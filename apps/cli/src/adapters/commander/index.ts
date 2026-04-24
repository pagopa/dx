import { Command } from "commander";

import { Config } from "../../config.js";
import { Dependencies } from "../../domain/dependencies.js";
import { makeAddCommand } from "./commands/add.js";
import {
  CodemodCommandDependencies,
  makeCodemodCommand,
} from "./commands/codemod.js";
import { makeDoctorCommand } from "./commands/doctor.js";
import { makeInfoCommand } from "./commands/info.js";
import { makeInitCommand } from "./commands/init.js";
import { makeSavemoneyCommand } from "./commands/savemoney.js";
import { formatErrorDetailed, toErrorMessage } from "./error-reporting.js";

export type CliDependencies = CodemodCommandDependencies;

export type GlobalOptions = {
  verbose?: boolean;
};

/**
 * Returns true when the global `--verbose` flag is active on the closest
 * ancestor command that defines it (the root `dx` program in our CLI).
 */
export const isVerbose = (command: Command): boolean =>
  command.optsWithGlobals<GlobalOptions>().verbose === true;

export const makeCli = (
  deps: Dependencies,
  config: Config,
  cliDeps: CliDependencies,
  version: string,
) => {
  const program = new Command();

  program
    .name("dx")
    .description("The CLI for DX-Platform")
    .version(version)
    .option(
      "-v, --verbose",
      "Enable verbose output: debug-level logs and full error chain (with stack traces) when a command fails",
      false,
    );

  program.addCommand(makeDoctorCommand(deps, config));
  program.addCommand(makeCodemodCommand(cliDeps));
  program.addCommand(makeInitCommand(deps));
  program.addCommand(makeSavemoneyCommand());
  program.addCommand(makeInfoCommand(deps));
  program.addCommand(makeAddCommand(deps));

  return program;
};

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
