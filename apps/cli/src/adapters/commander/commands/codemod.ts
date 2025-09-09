import { Command } from "commander";

import { ApplyCodemod } from "../../../use-cases/apply-codemod.js";
import { ListCodemods } from "../../../use-cases/list-codemods.js";

export type CodemodCommandDependencies = {
  applyCodemod: ApplyCodemod;
  listCodemods: ListCodemods;
};

export const makeCodemodCommand = ({
  applyCodemod,
  listCodemods,
}: CodemodCommandDependencies) =>
  new Command("codemod")
    .description("Manage and apply migration scripts to the repository")
    .addCommand(
      new Command("list")
        .description("List available migration scripts")
        .action(async function () {
          await listCodemods()
            .andTee((codemods) =>
              // eslint-disable-next-line no-console
              console.table(codemods, ["id", "description"]),
            )
            .orTee((error) => this.error(error.message));
        }),
    )
    .addCommand(
      new Command("apply")
        .argument("<id>", "The id of the codemod to apply")
        .description("Apply migration scripts to the repository")
        .action(async function (id) {
          await applyCodemod(id)
            .andTee(() => {
              // eslint-disable-next-line no-console
              console.log("Codemod applied successfully ✅");
            })
            .orTee((error) => this.error(error.message));
        }),
    );
