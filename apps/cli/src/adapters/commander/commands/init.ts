import { getLogger } from "@logtape/logtape";
import chalk from "chalk";
import { Command } from "commander";
import { $, ExecaError } from "execa";
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
import {
  getPlopInstance,
  runDeploymentEnvironmentGenerator,
  runMonorepoGenerator,
} from "../../plop/index.js";
import { exitWithError } from "../index.js";

type InitResult = {
  pr?: PullRequest;
  repository?: Repository;
};

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

const displaySummary = (initResult: InitResult) => {
  const { pr, repository } = initResult;
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
    console.log(chalk.green.bold("\nNext Steps:"));
    console.log(
      `1. Review the Pull Request in the GitHub repository: ${chalk.underline(pr.url)}`,
    );
    console.log(
      `2. Visit ${chalk.underline("https://dx.pagopa.it/getting-started")} to deploy your first project\n`,
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

const azureAccountSchema = z.object({
  user: z.object({
    name: z.string().min(1),
  }),
});

const ensureAzLogin = async (): Promise<string> => {
  const { stdout } = await tf$`az account show`;
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

const checkPreconditions = () =>
  checkTerraformCliIsInstalled().andThen(() => checkAzLogin());

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
    await git$`git add README.md`;
    await git$`git commit --no-gpg-sign -m "Create README.md"`;
    await git$`git branch -M main`;
    await git$`git remote add origin ${repository.origin}`;
    await git$`git push -u origin main`;
    await git$`git switch -c ${branchName}`;
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
  return new Error("Failed to run the generator");
};

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
        .andTee(() => {
          console.log(chalk.blue.bold("\nWorkspace Info"));
        })
        .andThen(() =>
          ResultAsync.fromPromise(
            getPlopInstance(),
            () => new Error("Failed to initialize plop"),
          ),
        )
        .andThen((plop) =>
          ResultAsync.fromPromise(
            runMonorepoGenerator(plop, gitHubService),
            handleGeneratorError,
          )
            .andTee((payload) => {
              process.chdir(payload.repoName);
              console.log(chalk.blue.bold("\nCloud Environment"));
            })
            .andThen((payload) =>
              ResultAsync.fromPromise(
                runDeploymentEnvironmentGenerator(plop),
                handleGeneratorError,
              ).map(() => payload),
            ),
        )
        .andTee(() => console.log()) // Print a new line before the gh repo creation logs
        .andThen((payload) => handleNewGitHubRepository(gitHubService)(payload))
        .match(displaySummary, exitWithError(this));
    });
