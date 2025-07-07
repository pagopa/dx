import { getLogger } from "@logtape/logtape";
import { Command } from "commander";

export const makeVersionCommand = (): Command => {
  const logger = getLogger(["dx-cli", "version"]);

  return new Command()
    .name("version")
    .alias("v")
    .description("Display version information")
    .action(() => logger.info(`dx CLI version: ${__CLI_VERSION__}`));
};
