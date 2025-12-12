import { Answers } from "@pagopa/monorepo-generator";
import loadMonorepoScaffolder, {
  answersSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "@pagopa/monorepo-generator";
import chalk from "chalk";
import { Command } from "commander";
import { $ } from "execa";
import { okAsync, ResultAsync } from "neverthrow";
import { PlopGenerator } from "node-plop";
import * as path from "node:path";
import { Octokit } from "octokit";
import { oraPromise } from "ora";

import { checkout, commit, git$, push } from "../../execa/git.js";
import { tf$ } from "../../execa/terraform.js";
import { getGenerator, getPrompts, initPlop } from "../../plop/index.js";
import { decode } from "../../zod/index.js";
import { exitWithError } from "../index.js";

type InitCommandDependencies = {
  octokit: Octokit;
};

type InitResult = {
  csp: {
    location: string;
    name: string;
  };
  pr?: PullRequest;
  repository: Repository;
};

type LocalWorkspace = {
  branchName: string;
  repository: Repository;
};

type PullRequest = {
  number: number;
  url: string;
};

type Repository = {
  name: string;
  owner: string;
  url?: string;
};

type RepositoryPullRequest = {
  pr?: PullRequest;
  repository: Repository;
};

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
    (cause) => {
      console.debug(JSON.stringify(cause, null, 2));
      return new Error(failText, { cause });
    },
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

const displaySummary = (initResult: InitResult) => {
  const { csp, pr, repository } = initResult;
  console.log(chalk.green.bold("\nWorkspace created successfully!"));
  console.log(`- Name: ${chalk.cyan(repository.name)}`);
  console.log(`- Cloud Service Provider: ${chalk.cyan(csp.name)}`);
  console.log(`- CSP location: ${chalk.cyan(csp.location)}`);

  if (repository.url) {
    console.log(`- GitHub Repository: ${chalk.cyan(repository.url)}\n`);
  } else {
    console.log(
      chalk.yellow(
        `\n⚠️ GitHub repository may not have been created automatically.`,
      ),
    );
  }

  if (pr) {
    console.log(chalk.green.bold("\nNext Steps:"));
    console.log(
      `1. Review the Pull Request in the GitHub repository: ${chalk.underline(pr.url)}`,
    );
    console.log(
      `2. Visit ${chalk.underline("https://dx.pagopa.it/getting-started")} to deploy your first project\n`,
    );
  }
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

const checkTerraformCliIsInstalled = (
  text: string,
  successText: string,
  failText: string,
) => withSpinner(text, successText, failText, tf$`terraform -version`);

const checkPreconditions = () =>
  checkGhCliIsInstalled(
    "Checking GitHub CLI ('gh') is installed...",
    "GitHub CLI ('gh') is installed!",
    "GitHub CLI ('gh') is not installed.",
  )
    .andThen(() =>
      checkGhCliIsLoggedIn(
        "Checking GitHub CLI ('gh') login...",
        "GitHub CLI ('gh') is logged in!",
        "GitHub CLI ('gh') is not logged in.",
      ),
    )
    .andThen(() =>
      checkTerraformCliIsInstalled(
        "Checking Terraform CLI is installed...",
        "Terraform CLI is installed!",
        "Terraform CLI is not installed.",
      ),
    );

const createRemoteRepository = ({
  repoName,
  repoOwner,
}: Answers): ResultAsync<Repository, Error> => {
  const cwd = path.resolve(repoName, "infra", "repository");
  const terraformInitPromise = tf$({
    cwd,
  })`terraform init`.then(() => tf$({ cwd })`terraform apply -auto-approve`);
  return withSpinner(
    "Creating GitHub repository...",
    "GitHub repository created successfully!",
    "Failed to create GitHub repository.",
    terraformInitPromise,
  ).map(() => ({
    name: repoName,
    owner: repoOwner,
    url: `https://github.com/${repoOwner}/${repoName}`,
  }));
};

const initializeGitRepository = (cwd: string, repository: Repository) => {
  const branchName = "features/scaffold-workspace";
  const promise = git$({
    cwd,
  })`git init`
    .then(
      () =>
        git$({
          cwd,
        })`git add README.md`,
    )
    .then(() => commit(cwd, "Create README"))
    .then(() => checkout(cwd, "main"))
    .then(
      () =>
        git$({
          cwd,
        })`git remote add origin git@github.com:${repository.owner}/${repository.name}.git`,
    )
    .then(() => push(cwd, "main"))
    .then(() => checkout(cwd, branchName))
    .then(
      () =>
        git$({
          cwd,
        })`git add .`,
    )
    .then(() => commit(cwd, "Scaffold workspace"))
    .then(() => push(cwd, branchName));

  return withSpinner(
    "Pushing code to GitHub...",
    "Code pushed to GitHub successfully!",
    "Failed to push code to GitHub.",
    promise,
  ).map(() => ({
    branchName,
    repository,
  }));
};

const pushLocalChangesToRemoteRepository = (
  repository: Repository,
): ResultAsync<LocalWorkspace, Error> => {
  const repoFolder = path.resolve(repository.name);
  return initializeGitRepository(repoFolder, repository);
};

// TODO: Open PR on created repository with the generated code
const handleNewGitHubRepository =
  (octokit: Octokit) =>
  (answers: Answers): ResultAsync<RepositoryPullRequest, Error> =>
    createRemoteRepository(answers)
      .andThen(pushLocalChangesToRemoteRepository)
      .andThen((result) =>
        createPullRequest(octokit)(result).map((pr) => ({
          pr,
          repository: result.repository,
        })),
      );

const makeInitResult = (
  answers: Answers,
  repository: Repository,
  pr?: PullRequest,
): InitResult => {
  const csp = {
    location:
      answers.csp === "azure" ? answers.azureLocation : answers.awsRegion,
    name: answers.csp,
  };
  return {
    csp,
    pr,
    repository,
  };
};

const createPullRequest =
  (octokit: Octokit) =>
  ({
    branchName,
    repository,
  }: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> =>
    withSpinner(
      "Creating pull request...",
      "Pull request created successfully!",
      "Failed to create pull request.",
      octokit.rest.pulls
        .create({
          base: "main",
          body: "This PR contains the scaffolded monorepo structure.",
          head: branchName,
          owner: repository.owner,
          repo: repository.name,
          title: "Scaffold repository",
        })
        .then(({ data }) => ({
          number: data.number,
          url: data.html_url,
        }))
        .catch(() => undefined),
    );

export const makeInitCommand = ({
  octokit,
}: InitCommandDependencies): Command =>
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
            .andThen((answers) =>
              handleNewGitHubRepository(octokit)(answers).map(
                ({ pr, repository }) => makeInitResult(answers, repository, pr),
              ),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
