import scaffoldMonorepo from "@pagopa/monorepo-generator";
import { Command } from "commander";
import { Result, ResultAsync } from "neverthrow";
import nodePlop from "node-plop";

export const makeInitCommand = (): Command =>
  new Command()
    .name("init")
    .description("Create a new monorepo repository")
    .action(async function () {
      await ResultAsync.fromPromise(
        nodePlop(),
        () => new Error("Failed to initialize plop"),
      )
        .andTee(scaffoldMonorepo)
        .andThen((plop) =>
          Result.fromThrowable(
            () => plop.getGenerator("monorepo"),
            () => new Error("Failed to get the monorepo generator"),
          )().asyncAndThen((generator) =>
            ResultAsync.fromPromise(
              generator.runPrompts(),
              () => new Error("Failed to run the generator prompts"),
            ).andThen((answers) =>
              ResultAsync.fromPromise(
                generator.runActions(answers),
                () => new Error("Failed to run the generator actions"),
              ),
            ),
          ),
        )
        .andTee(() => {
          //eslint-disable-next-line no-console
          console.log("Monorepo initialized successfully ✅");
        })
        .orTee((err) => {
          this.error(err.message);
        });
    });
