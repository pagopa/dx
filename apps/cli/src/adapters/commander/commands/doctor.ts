/**
 * `doctor` Commander command.
 *
 * Verifies the repository setup and routes the outcome through the shared
 * CommandPresenter port. JSON mode emits the structured result; text mode emits
 * a human-readable per-check summary. The exit code reflects whether any check
 * failed, mirroring the linter convention (a successful run can still report
 * problems).
 */
import chalk from "chalk";
import { Command } from "commander";

import type { CommandPresenter } from "../../../domain/command-presenter.js";
import type { Dependencies } from "../../../domain/dependencies.js";
import type { DoctorResult } from "../../../domain/doctor.js";
import type { ValidationCheck } from "../../../domain/validation.js";

import { Config } from "../../../config.js";
import { runDoctor } from "../../../domain/doctor.js";
import { GlobalOptions } from "../global-options.js";
import { createCommandPresenter } from "../presenters/index.js";

const formatCheck = (check: ValidationCheck): string =>
  check.isValid
    ? chalk.green(`✅ ${check.successMessage}`)
    : chalk.red(`❌ ${check.errorMessage}`);

const reportDoctorResult =
  (presenter: CommandPresenter, outputMode: "json" | "text") =>
  (result: DoctorResult): void => {
    presenter.reportResult(
      outputMode === "json"
        ? result
        : result.checks.map(formatCheck).join("\n"),
    );
  };

export const makeDoctorCommand = (
  dependencies: Dependencies,
  config: Config,
): Command =>
  new Command()
    .name("doctor")
    .description(
      "Verify the repository setup according to the DevEx guidelines",
    )
    .action(async function () {
      const { output } = this.optsWithGlobals<GlobalOptions>();
      const presenter = createCommandPresenter(output);

      const result = await runDoctor(dependencies, config);

      reportDoctorResult(presenter, output)(result);

      process.exitCode = result.hasErrors ? 1 : 0;
    });
