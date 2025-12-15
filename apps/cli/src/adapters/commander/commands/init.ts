import { Answers } from "@pagopa/monorepo-generator";
import loadMonorepoScaffolder, {
  answersSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "@pagopa/monorepo-generator";
import chalk from "chalk";
import { Command } from "commander";
import { okAsync, ResultAsync } from "neverthrow";
import { PlopGenerator } from "node-plop";
import * as path from "node:path";
import { oraPromise } from "ora";

import { git$ } from "../../execa/git.js";
import { tf$ } from "../../execa/terraform.js";
import { getGenerator, getPrompts, initPlop } from "../../plop/index.js";
import { decode } from "../../zod/index.js";
import { exitWithError } from "../index.js";

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

const checkTerraformCliIsInstalled = (
  text: string,
  successText: string,
  failText: string,
) => withSpinner(text, successText, failText, tf$`terraform -version`);

const checkPreconditions = () =>
  checkTerraformCliIsInstalled(
    "Checking Terraform CLI is installed...",
    "Terraform CLI is installed!",
    "Terraform CLI is not installed.",
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
  const git = git$({ cwd });
  const repoInitPromise = git`git init`
    .then(() => git`git add README.md`)
    .then(() =>
      git`git commit --no-gpg-sign -m "Create README"`
        .then(() => git`git branch -M main`)
        .then(
          () =>
            git`git remote add origin git@github.com:${repository.owner}/${repository.name}.git`,
        )
        .then(() => git`git push -u origin main`)
        .then(() => git`git switch -c ${branchName}`)
        .then(() => git`git add .`)
        .then(() => git`git commit --no-gpg-sign -m "Scaffold workspace"`),
    )
    .then(() => git`git push -u origin ${branchName}`);

  return withSpinner(
    "Pushing code to GitHub...",
    "Code pushed to GitHub successfully!",
    "Failed to push code to GitHub.",
    repoInitPromise,
  ).map(() => ({ branchName, repository }));
};

const pushLocalChangesToRemoteRepository = (
  repository: Repository,
): ResultAsync<LocalWorkspace, Error> => {
  const repoFolder = path.resolve(repository.name);
  return initializeGitRepository(repoFolder, repository);
};

const handleNewGitHubRepository = (
  answers: Answers,
): ResultAsync<RepositoryPullRequest, Error> =>
  createRemoteRepository(answers)
    .andThen(pushLocalChangesToRemoteRepository)
    .andThen((result) =>
      createPullRequest(result).map((pr) => ({
        pr,
        repository: result.repository,
      })),
    );

const makeInitResult = (
  answers: Answers,
  { pr, repository }: RepositoryPullRequest,
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

const createPullRequest = ({
  branchName,
  repository,
}: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> => {
  const cwd = path.resolve(repository.name);
  const prTitle = "Scaffold repository";
  const prBody = "This PR contains the scaffolded monorepo structure.";
  const createPrPromise = gh$({
    cwd,
  })`gh pr create --base main --head ${branchName} --title ${prTitle} --body ${prBody}`;

  return (
    withSpinner(
      "Creating Pull Request...",
      "Pull Request created successfully!",
      "Failed to create Pull Request.",
      createPrPromise,
    )
      .map(({ stdout }) => ({ url: stdout.trim() }))
      // If PR creation fails, don't block the workflow
      .orElse(() => okAsync(undefined))
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
              handleNewGitHubRepository(answers).map((repoPr) =>
                makeInitResult(answers, repoPr),
              ),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
