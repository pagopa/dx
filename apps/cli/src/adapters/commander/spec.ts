/**
 * Commander Spec Adapter
 *
 * Maps a Commander `Command` tree to the technology-agnostic `CliSpec` domain
 * type defined in `domain/spec.ts`.  This is the only place in the codebase
 * that depends on Commander's introspection API.
 */

import { Argument, Command, Option } from "commander";

import type {
  ArgumentSpec,
  CliSpec,
  CommandSpec,
  OptionSpec,
} from "../../domain/spec.js";

const INTERNAL_FLAGS = new Set(["--help", "--version"]);
const INTERNAL_ROOT_COMMANDS = new Set(["spec"]);

const mapOption = (opt: Option): OptionSpec => ({
  choices: opt.argChoices ?? [],
  defaultValue: opt.defaultValue,
  description: opt.description,
  flags: opt.flags,
  long: opt.long ?? undefined,
  optional: opt.optional,
  required: opt.required,
  short: opt.short ?? undefined,
});

const mapArgument = (arg: Argument): ArgumentSpec => ({
  choices: arg.argChoices ?? [],
  defaultValue: arg.defaultValue,
  description: arg.description,
  name: arg.name(),
  required: arg.required,
  variadic: arg.variadic,
});

const mapCommand = (cmd: Command): CommandSpec => ({
  arguments: cmd.registeredArguments.map(mapArgument),
  commands: cmd.commands.map(mapCommand),
  description: cmd.description(),
  name: cmd.name(),
  options: cmd.options
    .filter((opt) => !INTERNAL_FLAGS.has(opt.long ?? ""))
    .map(mapOption),
});

/**
 * Extracts the full CLI spec from a fully-constructed Commander `Command` tree.
 *
 * Should be called after all subcommands have been registered on `rootCommand`
 * so the spec reflects the complete command surface.
 */
export const extractCliSpec = (
  rootCommand: Command,
  version: string,
): CliSpec => ({
  commands: rootCommand.commands
    .filter((cmd) => !INTERNAL_ROOT_COMMANDS.has(cmd.name()))
    .map(mapCommand),
  description: rootCommand.description(),
  globalOptions: rootCommand.options
    .filter((opt) => !INTERNAL_FLAGS.has(opt.long ?? ""))
    .map(mapOption),
  name: rootCommand.name(),
  specVersion: "1",
  version,
});
