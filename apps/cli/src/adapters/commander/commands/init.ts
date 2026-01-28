import { setMonorepoGenerator } from "@pagopa/monorepo-generator";
import {
  Payload as Answers,
  payloadSchema as answersSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "@pagopa/monorepo-generator/generators/monorepo";
import chalk from "chalk";
import { Command } from "commander";
import { $ } from "execa";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { PlopGenerator } from "node-plop";
import * as path from "node:path";
import { oraPromise } from "ora";

import {
  GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
} from "../../../domain/github.js";
import { tf$ } from "../../execa/terraform.js";
import { getGenerator, getPrompts, initPlop } from "../../plop/index.js";
import { decode } from "../../zod/index.js";
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
      console.error(`Something went wrong: ${JSON.stringify(cause, null, 2)}`);
      return new Error(failText, { cause });
    },
  );

// TODO: Check Cloud Environment exists
// TODO: Check CSP CLI is installed
// TODO: Check user has permissions to handle Terraform state
const validateAnswers =
  (githubService: GitHubService) =>
  (answers: Answers): ResultAsync<Answers, Error> =>
    ResultAsync.fromPromise(
      githubService.getRepository(answers.repoOwner, answers.repoName),
      (error) => error as Error,
    )
      .andThen(({ fullName }) =>
        errAsync(new Error(`Repository ${fullName} already exists.`)),
      )
      .orElse((error) =>
        error instanceof RepositoryNotFoundError
          ? // If repository is not found, it's safe to proceed
            okAsync(answers)
          : // Otherwise, propagate the error
            errAsync(error),
      )
      .map(() => answers);

const runGeneratorActions = (generator: PlopGenerator) => (answers: Answers) =>
  withSpinner(
    "Creating workspace files...",
    "Workspace files created successfully!",
    "Failed to create workspace files.",
    generator.runActions(answers),
  ).map(() => answers);

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
  const applyTerraform = async () => {
    await tf$({ cwd })`terraform init`;
    await tf$({ cwd })`terraform apply -auto-approve`;
  };
  return withSpinner(
    "Creating GitHub repository...",
    "GitHub repository created successfully!",
    "Failed to create GitHub repository.",
    applyTerraform(),
  ).map(() => new Repository(repoName, repoOwner));
};

const initializeGitRepository = (repository: Repository) => {
  const cwd = path.resolve(repository.name);
  const branchName = "features/scaffold-workspace";
  const git$ = $({
    cwd,
    shell: true,
  });
  const pushToOrigin = async () => {
    await git$`git init`;
    await git$`git add README.md`;
    await git$`git commit --no-gpg-sign -m "Create README.md"`;
    await git$`git branch -M main`;
    await git$`git remote add origin ${repository.ssh}`;
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
  (answers: Answers): ResultAsync<RepositoryPullRequest, Error> =>
    createRemoteRepository(answers)
      .andThen(initializeGitRepository)
      .andThen((localWorkspace) =>
        createPullRequest(githubService)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
        })),
      );

const makeInitResult = (
  answers: Answers,
  { pr, repository }: RepositoryPullRequest,
): InitResult => ({
  pr,
  repository,
});

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

type InitCommandDependencies = {
  gitHubService: GitHubService;
};

export const makeInitCommand = ({
  gitHubService,
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
            .andTee(setMonorepoGenerator)
            .andThen((plop) => getGenerator(plop)(PLOP_MONOREPO_GENERATOR_NAME))
            .andThen((generator) =>
              // Ask the user the questions defined in the plop generator
              getPrompts(generator)
                // Decode the answers to match the Answers schema
                .andThen(decode(answersSchema))
                // Validate the answers (like checking permissions, checking GitHub user or org existence, etc.)
                .andThen(validateAnswers(gitHubService))
                // Run the generator with the provided answers (this will create the files locally)
                .andThen(runGeneratorActions(generator)),
            )
            .andThen((answers) =>
              handleNewGitHubRepository(gitHubService)(answers).map((repoPr) =>
                makeInitResult(answers, repoPr),
              ),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
