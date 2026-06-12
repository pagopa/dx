import { Command } from "commander";

import type { Dependencies } from "../../../domain/dependencies.js";

import { getInfo } from "../../../domain/info.js";
import { GlobalOptions } from "../global-options.js";
import { createCommandPresenter } from "../presenters/index.js";

export const makeInfoCommand = (dependencies: Dependencies): Command =>
  new Command()
    .name("info")
    .description("Display information about the project")
    .action(async function () {
      const { output } = this.optsWithGlobals<GlobalOptions>();
      const presenter = createCommandPresenter(output);
      const result = await getInfo(dependencies)();
      presenter.reportResult(result);
    });
