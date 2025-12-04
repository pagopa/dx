import { Answers } from "@pagopa/monorepo-generator";
import loadMonorepoScaffolder, {
  answersSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "@pagopa/monorepo-generator";
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
// Check repository already exists: if exists, return an error
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
  const cspLocation =
    csp === "azure" ? answers.azureLocation : answers.awsRegion;
  console.log(`- CSP location: ${chalk.cyan(cspLocation)}`);
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
          await checkPreconditions()
            .andThen(initPlop)
            .andTee(loadMonorepoScaffolder)
            .andThen((plop) => getGenerator(plop)(PLOP_MONOREPO_GENERATOR_NAME))
            // Before running prompts, check the preconditions are met (like gh CLI installed, user logged in, etc.)
            .andThen((generator) =>
              // Ask the user the questions defined in the plop generator
              getPrompts(generator)
                // Decode the answers to match the Answers schema
                .andThen(decode<Answers>(answersSchema))
                // Validate the answers (like checking permissions, checking GitHub user or org existence, etc.)
                .andThen(validateAnswers)
                // Run the generator with the provided answers (this will create the files locally)
                .andThen(runGeneratorActions(generator)),
            )
            .andThen(handleNewGitHubRepository)
            .match(displaySummary, exitWithError(this));
        }),
    );
