/**
 * Spec Command
 *
 * Implements the `dx spec` subcommand. Calls the injected `getSpec` factory
 * and writes the result as pretty-printed JSON to stdout.  The command has no
 * dependencies and requires no authentication.
 */

import { Command } from "commander";

import type { CliSpec } from "../../../domain/spec.js";

export const makeSpecCommand = (getSpec: () => CliSpec): Command =>
  new Command("spec")
    .description(
      "Print the full CLI spec as JSON (commands, subcommands, flags, arguments). Useful for agents that need to understand the CLI without running --help on every command.",
    )
    .action(() => {
      process.stdout.write(JSON.stringify(getSpec(), null, 2) + "\n");
    });
