import { Command } from "commander";

import { Config } from "../../../config.js";
import { Dependencies } from "../../../domain/dependencies.js";
import { getInfo, printInfo } from "../../../domain/info.js";

export const makeInfoCommand = (
  dependencies: Dependencies,
  config: Config,
  repositoryRoot: string,
): Command =>
  new Command()
    .name("info")
    .description("Display information about the project")
    .action(async () => {
      const result = await getInfo(dependencies, config, repositoryRoot)();
      printInfo(result);
    });
