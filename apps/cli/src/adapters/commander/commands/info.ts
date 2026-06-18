import { Command } from "commander";

import type { Dependencies } from "../../../domain/dependencies.js";
import type { CliEnv } from "../env.js";
import type { GlobalOptions } from "../global-options.js";

import { getInfo } from "../../../domain/info.js";
import {
  createCommandPresenter,
  resolveOutputMode,
} from "../presenters/index.js";

export const makeInfoCommand = (
  dependencies: Dependencies,
  env: CliEnv,
): Command =>
  new Command()
    .name("info")
    .description("Display information about the project")
    .action(async function () {
      const { output } = this.optsWithGlobals<GlobalOptions>();
      const presenter = createCommandPresenter(resolveOutputMode(env, output));
      const result = await getInfo(dependencies)();
      presenter.reportResult(result);
    });
