import scaffoldMonorepo from "@pagopa/monorepo-generator";
import { Command } from "commander";
import { Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";

const initPlop = () =>
  ResultAsync.fromPromise(
    nodePlop(),
    () => new Error("Failed to initialize plop"),
  );

const getGenerator = (plopAPI: NodePlopAPI) =>
  Result.fromThrowable(
    plopAPI.getGenerator,
    () => new Error("Generator not found"),
  );

const runGenerator = (generator: PlopGenerator) =>
  ResultAsync.fromPromise(
    generator.runPrompts(),
    () => new Error("Failed to run the generator prompts"),
  ).andThen((answers) =>
    ResultAsync.fromPromise(
      generator.runActions(answers),
      () => new Error("Failed to run the generator actions"),
    ),
  );

export const makeInitCommand = (): Command =>
  new Command()
    .name("init")
    .description(
      "Command to initialize resources (like projects, subscriptions, ...)",
    )
    .addCommand(
      new Command("project")
        .description("Initialize a new monorepo project")
        .action(async function () {
          await initPlop()
            .andTee(scaffoldMonorepo)
            .andThen((plop) => getGenerator(plop)("monorepo"))
            .andThen(runGenerator)
            .andTee(() => {
              console.log("Monorepo initialized successfully ✅");
            })
            .orTee((err) => {
              this.error(err.message);
            });
        }),
    );
