import type { Answers } from "@pagopa/monorepo-generator";

import scaffoldMonorepo, { answersSchema } from "@pagopa/monorepo-generator";
import chalk from "chalk";
import { Command } from "commander";
import { Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";
import { oraPromise } from "ora";

import { decode } from "../../zod/index.js";
import { exitWithError } from "../index.js";

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

// TODO: implement real validation logic
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
  const { csp, repoName, repoOwner } = answers;
  console.log(chalk.green.bold("\nWorkspace created successfully!"));
  console.log(`- Name: ${chalk.cyan(repoName)}`);
  console.log(`- Cloud Service Provider: ${chalk.cyan(csp)}`);
  console.log(
    `- GitHub Repository: ${chalk.cyan(`https://github.com/${repoOwner}/${repoName}`)}\n`,
  );

  console.log(chalk.green.bold("\nNext Steps:"));
  console.log(`1. Review the Pull Request in the GitHub repository.`);
  console.log(
    `2. Wait for the approve on eng-azure-authorization and then merge both PRs.`,
  );
  console.log(
    `3. Visit ${chalk.underline("https://dx.pagopa.it/getting-started")} to deploy your first project\n`,
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
                .andThen(decode<Answers>(answersSchema))
                .andTee(validateAnswers)
                .andThen(runGeneratorActions(generator)),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
