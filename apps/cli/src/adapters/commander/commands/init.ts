import { getLogger } from "@logtape/logtape";
import chalk from "chalk";
import { Command } from "commander";
import { $, ExecaError } from "execa";
import inquirer from "inquirer";
import { okAsync, ResultAsync } from "neverthrow";
import * as path from "node:path";
import { oraPromise } from "ora";
import { z } from "zod";

import {
  GitHubService,
  PullRequest,
  Repository,
} from "../../../domain/github.js";
import { tf$ } from "../../execa/terraform.js";
import { Payload as MonorepoPayload } from "../../plop/generators/monorepo/index.js";
import { getPlopInstance, runMonorepoGenerator } from "../../plop/index.js";
import { exitWithError } from "../index.js";

type GitHubRepoCreationSkippedResult = {
  gitHubRepoCreationSkipped: true;
  payload: MonorepoPayload;
};

type InitResult = {
  pr?: PullRequest;
  repository?: Repository;
};

type SummaryInput = GitHubRepoCreationSkippedResult | InitResult;

const isGitHubRepoCreationSkipped = (
  input: SummaryInput,
): input is GitHubRepoCreationSkippedResult =>
  "gitHubRepoCreationSkipped" in input;

type LocalWorkspace = {
  branchName: string;
  repository: Repository;
};

type RepositoryPullRequest = {
  pr?: PullRequest;
  repository: Repository;
};

const withSpinner = <T>(
  text: string,
  successText: ((value: T) => string) | string,
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

const displaySummary = (input: SummaryInput) => {
  const docsUrl = "https://dx.pagopa.it/getting-started";

  if (isGitHubRepoCreationSkipped(input)) {
    const { payload } = input;
    console.log(chalk.yellow.bold("\nGitHub repository creation skipped."));
    console.log(
      `The workspace files have been scaffolded in ${chalk.cyan(payload.repoName + "/")}.`,
    );
    console.log(chalk.bold("\nTo finish the setup manually:"));
    let step = 1;
    console.log(
      `${step++}. Create the GitHub repository by applying the Terraform config scaffolded at ${chalk.cyan(`${payload.repoName}/infra/repository`)}:`,
    );
    console.log(
      `       ${chalk.cyan(`cd ${payload.repoName}/infra/repository && terraform init && terraform apply`)}`,
    );
    console.log(
      `${step++}. Push the scaffolded code to the newly created repository:`,
    );
    console.log(
      `       ${chalk.cyan(`cd ${payload.repoName} && git init && git remote add origin <url> && git push`)}`,
    );
    console.log(
      `${step}. Visit ${chalk.underline(docsUrl)} to deploy your first project\n`,
    );
    return;
  }

  const { pr, repository } = input;
  console.log(chalk.green.bold("\nWorkspace created successfully!"));

  if (repository) {
    console.log(`- Name: ${chalk.cyan(repository.name)}`);
    console.log(`- GitHub Repository: ${chalk.cyan(repository.url)}\n`);
  } else {
    console.log(
      chalk.yellow(
        `\n⚠️ GitHub repository may not have been created automatically.`,
      ),
    );
  }

  if (pr) {
    let step = 1;
    console.log(chalk.green.bold("\nNext Steps:"));
    console.log(
      `${step++}. Review the Pull Request in the GitHub repository: ${chalk.underline(pr.url)}`,
    );
    console.log(
      `${step}. Visit ${chalk.underline(docsUrl)} to deploy your first project\n`,
    );
  } else {
    console.log(
      chalk.yellow(`\n⚠️ There was an error during Pull Request creation.`),
    );
    console.log(
      `Please, manually create a Pull Request in the GitHub repository to review the scaffolded code.\n`,
    );
  }
};

const checkTerraformCliIsInstalled = () =>
  withSpinner(
    "Checking Terraform installation...",
    "Terraform is installed!",
    "Please install terraform CLI before running this command. If you use tfenv, run: tfenv install latest && tfenv use latest",
    tf$`terraform -version`,
  );

const checkCorepackIsInstalled = () =>
  withSpinner(
    "Checking Corepack installation...",
    "Corepack is installed!",
    "Please install Corepack before running this command.",
    tf$`corepack -v`,
  );

const azureAccountSchema = z.object({
  user: z.object({
    name: z.string().min(1),
  }),
});

const ensureAzLogin = async (): Promise<string> => {
  const { stdout } = await tf$`az account show`;
  // `az account show` reads the cached CLI context, but `az group list`
  // fails when the current session token has expired.
  await tf$`az group list`;
  const parsed = JSON.parse(stdout);
  const { user } = azureAccountSchema.parse(parsed);
  return user.name;
};

const checkAzLogin = () =>
  withSpinner(
    "Check Azure login status...",
    (userName) => `You are logged in to Azure (${userName})`,
    "Please log in to Azure CLI using `az login` before running this command.",
    ensureAzLogin(),
  );

// TODO(CES-1810): Make these checks concurrent to speed up the preconditions check phase
export const checkPreconditions = () =>
  checkTerraformCliIsInstalled()
    .andThen(() => checkAzLogin())
    .andThen(() => checkCorepackIsInstalled());

const createRemoteRepository = ({
  repoName,
  repoOwner,
}: MonorepoPayload): ResultAsync<Repository, Error> => {
  const logger = getLogger(["dx-cli", "init"]);
  const repo$ = tf$({ cwd: path.resolve("infra", "repository") });
  const applyTerraform = async () => {
    try {
      await repo$`terraform init`;
      await repo$`terraform apply -auto-approve`;
    } catch (error) {
      if (error instanceof ExecaError) {
        logger.error(error.shortMessage);
      }
      throw error;
    }
  };
  return withSpinner(
    "Creating GitHub repository...",
    "GitHub repository created successfully!",
    "Failed to create GitHub repository.",
    applyTerraform(),
  ).map(() => new Repository(repoName, repoOwner));
};

const initializeGitRepository = (repository: Repository) => {
  const branchName = "features/scaffold-workspace";
  const git$ = $({
    shell: true,
  });
  const pushToOrigin = async () => {
    await git$`git init`;
    await git$`git remote add origin ${repository.origin}`;
    await git$`git fetch origin main`;
    await git$`git checkout -b ${branchName}`;
    // Terraform creates `main` with an initial README commit.
    // Reset to `origin/main` so this branch is based on the remote default branch,
    // while keeping the scaffolded local files in the working tree for a clean PR diff.
    await git$`git reset origin/main`;
    await git$`git add .`;
    await git$`git commit --no-gpg-sign -m "Scaffold workspace"`;
    await git$`git push -u origin ${branchName}`;
  };
  return withSpinner(
    "Pushing code to GitHub...",
    "Code pushed to GitHub successfully!",
    "Failed to push code to GitHub.",
    pushToOrigin(),
  ).map(() => ({ branchName, repository }));
};

const handleNewGitHubRepository =
  (githubService: GitHubService) =>
  (payload: MonorepoPayload): ResultAsync<RepositoryPullRequest, Error> =>
    createRemoteRepository(payload)
      .andThen(initializeGitRepository)
      .andThen((localWorkspace) =>
        createPullRequest(githubService)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
        })),
      );

const createPullRequest =
  (githubService: GitHubService) =>
  ({
    branchName,
    repository,
  }: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> =>
    withSpinner(
      "Creating Pull Request...",
      "Pull Request created successfully!",
      "Failed to create Pull Request.",
      githubService.createPullRequest({
        base: "main",
        body: "This PR contains the scaffolded monorepo structure.",
        head: branchName,
        owner: repository.owner,
        repo: repository.name,
        title: "Scaffold repository",
      }),
    )
      // If PR creation fails, don't block the workflow
      .orElse(() => okAsync(undefined));

const handleGeneratorError = (err: unknown) => {
  const logger = getLogger(["dx-cli", "init"]);
  if (err instanceof Error) {
    logger.error(err.message);
  }
  return new Error("Failed to run the generator", { cause: err });
};

export const confirmGitHubRepoCreation = (
  payload: MonorepoPayload,
): ResultAsync<boolean, Error> =>
  ResultAsync.fromPromise(
    inquirer
      .prompt({
        default: true,
        message: `The project is created on ${chalk.green(payload.repoName)}. Would you like to publish it to GitHub at ${chalk.green(`${payload.repoOwner}/${payload.repoName}`)} now?`,
        name: "confirm",
        type: "confirm",
      })
      .then(({ confirm }: { confirm: boolean }) => confirm),
    (cause) =>
      new Error("Failed to read GitHub publish confirmation", { cause }),
  );

type InitCommandDependencies = {
  gitHubService: GitHubService;
};

export const makeInitCommand = ({
  gitHubService,
}: InitCommandDependencies): Command =>
  new Command()
    .name("init")
    .description("Initialize a new DX workspace")
    .action(async function () {
      await checkPreconditions()
        .andThen(() =>
          ResultAsync.fromPromise(
            getPlopInstance(),
            (cause) => new Error("Failed to initialize plop", { cause }),
          ),
        )
        .andThen((plop) =>
          ResultAsync.fromPromise(
            runMonorepoGenerator(plop, gitHubService),
            handleGeneratorError,
          ),
        )
        .andTee((payload) => {
          process.chdir(payload.repoName);
        })
        .andThen((payload) =>
          confirmGitHubRepoCreation(payload).andThen<SummaryInput, Error>(
            (confirmed) =>
              confirmed
                ? handleNewGitHubRepository(gitHubService)(payload)
                : okAsync({ gitHubRepoCreationSkipped: true, payload }),
          ),
        )
        .match(displaySummary, exitWithError(this));
    });
