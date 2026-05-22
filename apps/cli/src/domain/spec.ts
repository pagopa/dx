/**
 * Spec Domain
 *
 * Pure types that describe the shape of the CLI spec output.
 * Technology-agnostic: no dependency on Commander or any CLI framework.
 * Consumed by the Commander adapter and by agent tooling that parses `dx spec`.
 */

export type ArgumentSpec = {
  /** Allowed values when the argument is constrained to a set */
  choices: string[];
  defaultValue: unknown;
  description: string;
  name: string;
  required: boolean;
  variadic: boolean;
};

export type CliSpec = {
  /** Top-level subcommands with their own options, arguments, and nested commands. */
  commands: CommandSpec[];
  description: string;
  /** Options defined directly on the root `dx` program (global flags). */
  globalOptions: OptionSpec[];
  name: string;
  /** Stable version of the spec JSON shape. Increment on breaking changes. */
  specVersion: "1";
  version: string;
};

export type CommandSpec = {
  arguments: ArgumentSpec[];
  commands: CommandSpec[];
  description: string;
  name: string;
  options: OptionSpec[];
};

export type OptionSpec = {
  /** Allowed values when the option is an enum */
  choices: string[];
  defaultValue: unknown;
  description: string;
  /** Raw flags string as shown in help, e.g. "-v, --verbose" */
  flags: string;
  /** Long flag, e.g. "--verbose" */
  long: string | undefined;
  /** True when the option value is optional (e.g. `--output [mode]`) */
  optional: boolean;
  /** True when the option value is mandatory (e.g. `--output <mode>`) */
  required: boolean;
  /** Short flag, e.g. "-v" (undefined when not present) */
  short: string | undefined;
};
