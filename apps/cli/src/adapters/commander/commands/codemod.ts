import { Command } from "commander";
import { ResultAsync } from "neverthrow";

import type { CommandPresenter } from "../../../domain/command-presenter.js";
import type { ApplyCodemodById } from "../../../use-cases/apply-codemod.js";
import type { ListCodemods } from "../../../use-cases/list-codemods.js";
import type { GlobalOptions } from "../index.js";

import { exitWithError } from "../command-errors.js";
import { createCommandPresenter } from "../presenters/index.js";

export type CodemodCommandDependencies = {
  applyCodemodById: ApplyCodemodById;
  listCodemods: ListCodemods;
};

const reportCommandError =
  (
    command: Command,
    presenter: CommandPresenter,
    outputMode: "json" | "text",
  ) =>
  (error: Error) => {
    if (outputMode === "json") {
      presenter.reportError(error);
      process.exitCode = 1;
    } else {
      exitWithError(command)(error);
    }
  };

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const makeCodemodCommand = ({
  applyCodemodById,
  listCodemods,
}: CodemodCommandDependencies) =>
  new Command("codemod")
    .description("Manage and apply migration scripts to the repository")
    .addCommand(
      new Command("list")
        .description("List available migration scripts")
        .action(async function () {
          const { output } = this.optsWithGlobals<GlobalOptions>();
          const presenter = createCommandPresenter(output);

          await listCodemods()
            .andTee((codemods) => presenter.reportResult(codemods))
            .orTee(reportCommandError(this, presenter, output));
        }),
    )
    .addCommand(
      new Command("apply")
        .argument("<id>", "The id of the codemod to apply")
        .description("Apply migration scripts to the repository")
        .action(async function (id) {
          const { output } = this.optsWithGlobals<GlobalOptions>();
          const presenter = createCommandPresenter(output);

          await ResultAsync.fromPromise(
            presenter.trackStep(`Applying codemod ${id}...`, () =>
              applyCodemodById(id).match(
                () => undefined,
                (error) => {
                  throw error;
                },
              ),
            ),
            toError,
          )
            .map(() => ({ id }))
            .andTee((result) => presenter.reportResult(result))
            .orTee(reportCommandError(this, presenter, output));
        }),
    );
