import { Command, Option } from "commander";

import type { CliEnv } from "./env.js";

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
import { makeSpecCommand } from "./commands/spec.js";
import { extractCliSpec } from "./spec.js";
export type CliDependencies = CodemodCommandDependencies;

export const makeCli = (
  deps: Dependencies,
  config: Config,
  cliDeps: CliDependencies,
  env: CliEnv,
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
    )
    .addOption(
      new Option(
        "--output <mode>",
        "Output mode: text (default, human-readable) or json (structured events to stdout for agents)",
      )
        .choices(["text", "json"])
        .default("text"),
    );

  program.addCommand(makeDoctorCommand(deps, config, env));
  program.addCommand(makeCodemodCommand(cliDeps, env));
  program.addCommand(makeInitCommand(deps.requireGitHubAuth, env));
  program.addCommand(makeSavemoneyCommand());
  program.addCommand(makeInfoCommand(deps, env));
  program.addCommand(makeAddCommand(deps.requireGitHubAuth, env));

  // spec is registered last so the closure captures the complete command tree.
  program.addCommand(makeSpecCommand(() => extractCliSpec(program, version)));

  return program;
};
