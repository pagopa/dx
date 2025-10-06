import { getLogger } from "@logtape/logtape";
import { Command } from "commander";

import { ApplyCodemodById } from "../../../use-cases/apply-codemod.js";
import { ListCodemods } from "../../../use-cases/list-codemods.js";

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
          await listCodemods()
            .andTee((codemods) =>
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
          const logger = getLogger(["dx-cli", "codemod"]);
          await applyCodemodById(id)
            .andTee(() => {
              logger.info("Codemod applied ✅");
            })
            .orTee((error) => this.error(error.message));
        }),
    );
