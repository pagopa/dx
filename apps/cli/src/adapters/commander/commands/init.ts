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
        `\n⚠️  GitHub repository may not have been created automatically.`,
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
) => withSpinner(text, successText, failText, $`terraform -version`);

const checkPreconditions = () =>
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
  const tfRepositoryFolder = path.resolve(repoName, "infra", "repository");
  const terraformApplyPromise = $({
    cwd: tfRepositoryFolder,
    environment: {
      NO_COLOR: "1",
      TF_IN_AUTOMATION: "1",
      TF_INPUT: "0",
    },
    shell: true,
  })`terraform init`.then(
    () =>
      $({
        cwd: tfRepositoryFolder,
        environment: {
          NO_COLOR: "1",
          TF_INPUT: "0",
        },
        shell: true,
      })`terraform apply -auto-approve`,
  );
  const repository = {
    name: repoName,
    owner: repoOwner,
  };
  return (
    withSpinner(
      "Creating GitHub repository...",
      "GitHub repository created successfully!",
      "Failed to create GitHub repository.",
      terraformApplyPromise,
    )
      .map(() => ({
        ...repository,
        url: `https://github.com/${repoOwner}/${repoName}`,
      }))
      // In case of a failure, returns the repository info without URL
      .orElse(() => okAsync(repository))
  );
};

const initializeGitRepository = (repoFolder: string) =>
  withSpinner(
    "Initializing git repository...",
    "Git repository initialized successfully!",
    "Failed to initialize git repository.",
    $({ cwd: repoFolder, shell: true })`git init`,
  );

const addAllChanges = (repoFolder: string) =>
  withSpinner(
    "Adding changes to git...",
    "Changes added successfully!",
    "Failed to add changes to git.",
    $({ cwd: repoFolder, shell: true })`git add .`,
  );

const commitChanges = (repoFolder: string) =>
  withSpinner(
    "Committing changes...",
    "Changes committed successfully!",
    "Failed to commit changes.",
    $({
      cwd: repoFolder,
      shell: true,
    })`git commit --no-gpg-sign -m "Scaffold workspace"`,
  );

const setRemoteOrigin = (repoFolder: string, { name, owner }: Repository) =>
  withSpinner(
    "Setting remote origin...",
    "Remote origin set successfully!",
    "Failed to set remote origin.",
    $({
      cwd: repoFolder,
      shell: true,
    })`git remote add origin git@github.com:${owner}/${name}.git`,
  );

const createAndPushBranch = (repoFolder: string, branchName: string) =>
  withSpinner(
    `Pushing changes to branch '${branchName}'...`,
    `Changes pushed to branch '${branchName}' successfully!`,
    `Failed to push changes to branch '${branchName}'.`,
    $({
      cwd: repoFolder,
      shell: true,
    })`git branch -M ${branchName} && git push -u origin ${branchName}`,
  );

const pushLocalChangesToRemoteRepository = (
  repository: Repository,
): ResultAsync<LocalWorkspace, Error> => {
  const { name } = repository;
  const repoFolder = path.resolve(name);
  const branchName = "features/scaffold-workspace";

  return initializeGitRepository(repoFolder)
    .andThen(() => addAllChanges(repoFolder))
    .andThen(() => commitChanges(repoFolder))
    .andThen(() => setRemoteOrigin(repoFolder, repository))
    .andThen(() => createAndPushBranch(repoFolder, branchName))
    .map(() => ({ branchName, repository }));
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

const handleNewGitHubRepository =
  (octokit: Octokit) =>
  (answers: Answers): ResultAsync<InitResult, Error> => {
    const csp = {
      location:
        answers.csp === "aws" ? answers.awsRegion : answers.azureLocation,
      name: answers.csp,
    };
    return createRemoteRepository(answers)
      .andThen(pushLocalChangesToRemoteRepository)
      .andThen((localWorkspace) =>
        createPullRequest(octokit)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
        })),
      )
      .map(({ pr, repository }) => ({
        csp,
        pr,
        repository,
      }));
  };

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
            .andThen(handleNewGitHubRepository(octokit))
            .match(displaySummary, exitWithError(this));
        }),
    );
