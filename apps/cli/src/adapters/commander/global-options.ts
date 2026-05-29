/**
 * Shared root CLI options exposed to nested Commander commands.
 *
 * The root `dx` program defines these options once, and nested commands read
 * them via `optsWithGlobals()` to keep cross-command behavior consistent.
 */
import type { Command } from "commander";

export type GlobalOptions = {
  output: "json" | "text";
  verbose?: boolean;
};

export const isVerbose = (command: Command): boolean =>
  command.optsWithGlobals<GlobalOptions>().verbose === true;
