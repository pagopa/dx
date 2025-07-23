import { Command } from "commander";

import { Dependencies } from "../../../domain/dependencies.js";
import { getInfo, printInfo } from "../../../domain/info.js";

export const makeInfoCommand = (dependencies: Dependencies): Command =>
  new Command()
    .name("info")
    .description("Display information about the project")
    .action(async () => {
      const result = await getInfo(dependencies);
      printInfo(result);
    });
