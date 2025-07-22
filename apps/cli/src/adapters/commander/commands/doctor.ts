import { Command } from "commander";
import * as process from "node:process";

import { Config } from "../../../config.js";
import { CliEnv } from "../../../domain/cli.js";

export const makeDoctorCommand = (
  { doctor, printResult }: Pick<CliEnv, "doctor" | "printResult">,
  config: Config,
): Command =>
  new Command()
    .name("doctor")
    .description(
      "Verify the repository setup according to the DevEx guidelines",
    )
    .action(async () => {
      const result = await doctor(config);
      printResult(result);

      const exitCode = result.hasErrors ? 1 : 0;
      process.exit(exitCode);
    });
