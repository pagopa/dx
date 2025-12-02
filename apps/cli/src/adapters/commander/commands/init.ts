import type { Answers } from "@pagopa/monorepo-generator";

import scaffoldMonorepo, { answersSchema } from "@pagopa/monorepo-generator";
import { Command } from "commander";
import { Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";
import { oraPromise } from "ora";

import { decode } from "../../zod/index.js";

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

const getPrompts = (generator: PlopGenerator) =>
  ResultAsync.fromPromise(
    generator.runPrompts(),
    (error) =>
      new Error("Failed to run the generator prompts", { cause: error }),
  );

const withSpinner = <T, E = Error>(
  text: string,
  successText: string,
  failText: string,
  task: () => Promise<T>,
): ResultAsync<T, E> =>
  ResultAsync.fromSafePromise(
    oraPromise(task(), {
      failText,
      successText,
      text,
    }),
  );

const validateAnswers = (answers: Answers): ResultAsync<Answers, Error> =>
  withSpinner(
    "Checking permissions...",
    "You have the necessary permissions!",
    "You do not have the necessary permissions.",
    async () => {
      // Simulate some async validation logic
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return answers;
    },
  );

const runGeneratorActions = (generator: PlopGenerator) => (answers: Answers) =>
  ResultAsync.fromPromise(
    generator.runActions(answers),
    (error) =>
      new Error("Failed to run the generator actions", { cause: error }),
  ).map(() => answers);

const displaySummary = (answers: Answers) => {
  console.log("\n🎉 Workspace created successfully!\n");
  console.log(`- Name: ${answers.repoName}`);
  console.log(`- Description: ${answers.repoDescription}`);
  console.log(`- Cloud Service Provider: ${answers.csp}`);
  console.log(
    `- GitHub Repository: https://github.com/pagopa/${answers.repoName}`,
  );
};

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
            .andThen((generator) =>
              getPrompts(generator)
                .andThen(decode(answersSchema))
                .andTee(validateAnswers)
                .andThen(runGeneratorActions(generator))
                .andTee(displaySummary),
            )
            .orTee((err) => {
              this.error(err.message);
            });
        }),
    );
