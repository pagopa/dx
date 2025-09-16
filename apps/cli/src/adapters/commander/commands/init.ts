import { Command } from "commander";

export const makeInitCommand = (): Command =>
  new Command()
    .name("init")
    .description("Create a new monorepo")
    .action(async () => {
      //eslint-disable-next-line no-console
      console.log("(WIP) - Initializing a new monorepo...");
    });
