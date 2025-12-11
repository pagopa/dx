import { Answers } from "@pagopa/monorepo-generator";
import loadMonorepoScaffolder, {
  answersSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "@pagopa/monorepo-generator";
import chalk from "chalk";
import { Command } from "commander";
import { $ } from "execa";
import { okAsync, Result, ResultAsync } from "neverthrow";
import nodePlop, { NodePlopAPI, PlopGenerator } from "node-plop";
import { resolve } from "node:path";
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
    (cause) => new Error("Failed to run the generator prompts", { cause }),
  );

const withSpinner = <T>(
  text: string,
  successText: string,
  failText: string,
  promise: Promise<T>,
): ResultAsync<T, Error> =>
  ResultAsync.fromPromise(
    oraPromise(promise, {
      failText,
      successText,
      text,
    }),
    (cause) => new Error(failText, { cause }),
  );

// TODO: Check repository already exists: if exists, return an error
// TODO: Check Cloud Environment exists
// TODO: Check CSP CLI is installed
// TODO: Check user has permissions to handle Terraform state
const validateAnswers = (answers: Answers): ResultAsync<Answers, Error> =>
  okAsync(answers);

const runGeneratorActions = (generator: PlopGenerator) => (answers: Answers) =>
  withSpinner(
    "Creating workspace files...",
    "Workspace files created successfully!",
    "Failed to create workspace files.",
    generator.runActions(answers),
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
    `2. Wait for the approval on eng-azure-authorization and then merge both PRs.`,
  );
  console.log(
    `3. Visit ${chalk.underline("https://dx.pagopa.it/getting-started")} to deploy your first project\n`,
  );
};

const checkGhCliIsInstalled = (
  text: string,
  successText: string,
  failText: string,
) => withSpinner(text, successText, failText, $`gh --version`);

const checkGhCliIsLoggedIn = (
  text: string,
  successText: string,
  failText: string,
) => withSpinner(text, successText, failText, $`gh auth status`);

const checkPreconditions = (): ResultAsync<void, Error> =>
  checkGhCliIsInstalled(
    "Checking GitHub CLI is installed...",
    "GitHub CLI is installed!",
    "GitHub CLI is not installed.",
  )
    .andThen(() =>
      checkGhCliIsLoggedIn(
        "Checking GitHub CLI login...",
        "GitHub CLI is logged in!",
        "GitHub CLI is not logged in.",
      ),
    )
    .map(() => undefined);

const initializeTerraformBackend = (answers: Answers) =>
  withSpinner(
    "Initializing Terraform backend...",
    "Terraform backend initialized successfully!",
    "Failed to initialize Terraform backend.",
    $({
      cwd: resolve(answers.repoName, "infra", "repository"),
      environment: {
        NO_COLOR: 1,
        TF_IN_AUTOMATION: 1,
        TF_INPUT: 0,
      },
      shell: true,
    })`terraform init`,
  ).map(() => answers);

const createGitHubRepositoryWithTerraform = (answers: Answers) =>
  withSpinner(
    "Creating GitHub repository with Terraform...",
    "GitHub repository created successfully!",
    "Failed to create GitHub repository.",
    $({
      cwd: resolve(answers.repoName, "infra", "repository"),
      environment: {
        NO_COLOR: 1,
        TF_CLI_ARGS_apply: "-auto-approve",
        TF_IN_AUTOMATION: 1,
        TF_INPUT: 0,
      },
      shell: true,
    })`terraform apply`,
  ).map(() => answers);

const createRemoteRepository = (
  answers: Answers,
): ResultAsync<Answers, Error> =>
  initializeTerraformBackend(answers).andThen(
    createGitHubRepositoryWithTerraform,
  );

// TODO: Create GitHub repository pushing the generated code
// TODO: Open PR on created repository with the generated code
const handleNewGitHubRepository = (
  answers: Answers,
): ResultAsync<Answers, Error> =>
  createRemoteRepository(answers).orElse(() => okAsync(answers));

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
                .andThen(decode(answersSchema))
                // Validate the answers (like checking permissions, checking GitHub user or org existence, etc.)
                .andThen(validateAnswers)
                // Run the generator with the provided answers (this will create the files locally)
                .andThen(runGeneratorActions(generator)),
            )
            .andThen(handleNewGitHubRepository)
            .match(displaySummary, exitWithError(this));
        }),
    );
