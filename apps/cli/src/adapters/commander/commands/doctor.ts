import { Command } from "commander";
import * as process from "node:process";

import { Config } from "../../../config.js";
import { Dependencies } from "../../../domain/dependencies.js";
import { printDoctorResult, runDoctor } from "../../../domain/doctor.js";

export const makeDoctorCommand = (
  dependencies: Dependencies,
  config: Config,
): Command =>
  new Command()
    .name("doctor")
    .description(
      "Verify the repository setup according to the DevEx guidelines",
    )
    .action(async () => {
      const result = await runDoctor(dependencies, config);
      printDoctorResult(dependencies, result);

      const exitCode = result.hasErrors ? 1 : 0;
      process.exit(exitCode);
    });
