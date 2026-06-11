import { Command, Option } from "commander";
import { ResultAsync } from "neverthrow";
import { z } from "zod";

import { Config } from "../../../config.js";
import { Dependencies } from "../../../domain/dependencies.js";
import {
  DoctorOptions,
  printDoctorResult,
  runDoctor,
} from "../../../domain/doctor.js";

const doctorCommandOptionsSchema = z.object({
  path: z.string().trim().min(1, "Repository path cannot be empty").optional(),
});

export const parseDoctorCommandOptions = (input: unknown): DoctorOptions => {
  const result = doctorCommandOptionsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error), {
      cause: result.error,
    });
  }

  return result.data.path ? { repositoryPath: result.data.path } : {};
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
    .addOption(
      new Option(
        "-p, --path <path>",
        "Repository path to inspect instead of the current working directory",
      ),
    )
    .action(async function (options: unknown) {
      await ResultAsync.fromPromise(
        Promise.resolve().then(() => parseDoctorCommandOptions(options)),
        (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Failed to parse doctor command options", { cause }),
      )
        .andThen((doctorOpts) =>
          ResultAsync.fromPromise(
            runDoctor(dependencies, config, doctorOpts),
            (cause) =>
              cause instanceof Error
                ? cause
                : new Error("Failed to run doctor command", {
                    cause,
                  }),
          ),
        )
        .match(
          (result) => printDoctorResult(dependencies, result),
          (error) => this.error(error.message),
        );
    });
