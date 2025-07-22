import { Command } from "commander";

import { CliEnv } from "../../../domain/cli.js";

export const makeVersionCommand = ({
  printVersion,
}: Pick<CliEnv, "printVersion">): Command =>
  new Command()
    .name("version")
    .alias("v")
    .action(() => printVersion());
