import { Command } from "commander";
import { ResultAsync } from "neverthrow";

import type { ApplyCodemodById } from "../../../use-cases/apply-codemod.js";
import type { ListCodemods } from "../../../use-cases/list-codemods.js";

import { asError, reportCommandError } from "../command-errors.js";
import { GlobalOptions } from "../global-options.js";
import { createCommandPresenter } from "../presenters/index.js";

export type CodemodCommandDependencies = {
  applyCodemodById: ApplyCodemodById;
  listCodemods: ListCodemods;
};

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
            .map((codemods) =>
              codemods.map(({ description, id }) => ({ description, id })),
            )
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
            asError(`Failed to apply codemod ${id}`),
          )
            .map(() => ({ id }))
            .andTee((result) => presenter.reportResult(result))
            .orTee(reportCommandError(this, presenter, output));
        }),
    );
