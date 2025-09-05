import { Command } from "commander";

import { printVersion } from "../../../domain/version.js";

export const makeVersionCommand = (): Command =>
  new Command()
    .name("version")
    .alias("v")
    .action(() => printVersion());
