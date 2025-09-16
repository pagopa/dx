import scaffoldMonorepo from "@pagopa/monorepo-generator";
import { Command } from "commander";
import nodePlop from "node-plop";

export const makeInitCommand = (): Command =>
  new Command()
    .name("init")
    .description("Create a new monorepo")
    .action(async () => {
      //eslint-disable-next-line no-console
      console.log("(WIP) - Initializing a new monorepo...");

      const plop = await nodePlop();
      scaffoldMonorepo(plop);

      const generator = plop.getGenerator("monorepo");
      await generator.runPrompts();
    });
