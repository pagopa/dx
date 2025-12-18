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
  repository?: Repository;
};

type LocalWorkspace = {
  branchName: string;
  repository: Repository;
};

type PullRequest = {
  url: string;
};

type RepositoryPullRequest = {
  pr?: PullRequest;
  repository: Repository;
};

class Repository {
  get ssh(): string {
    return `git@github.com:${this.owner}/${this.name}.git`;
  }

  get url(): string {
    return `https://github.com/${this.owner}/${this.name}`;
  }

  constructor(
    public readonly name: string,
    public readonly owner: string,
  ) {}
}

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

const displaySummary = (initResult: InitResult) => {
  const { csp, pr, repository } = initResult;
  console.log(chalk.green.bold("\nWorkspace created successfully!"));
  console.log(`- Cloud Service Provider: ${chalk.cyan(csp.name)}`);
  console.log(`- CSP location: ${chalk.cyan(csp.location)}`);

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
  (octokit: Octokit) =>
  (answers: Answers): ResultAsync<RepositoryPullRequest, Error> =>
    createRemoteRepository(answers)
      .andThen(initializeGitRepository)
      .andThen((localWorkspace) =>
        createPullRequest(octokit)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
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

const createPullRequest =
  (octokit: Octokit) =>
  ({
    branchName,
    repository,
  }: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> =>
    withSpinner(
      "Creating Pull Request...",
      "Pull Request created successfully!",
      "Failed to create Pull Request.",
      octokit.rest.pulls.create({
        base: "main",
        body: "This PR contains the scaffolded monorepo structure.",
        head: branchName,
        owner: repository.owner,
        repo: repository.name,
        title: "Scaffold repository",
      }),
    )
      .map(({ data }) => ({ url: data.html_url }))
      // If PR creation fails, don't block the workflow
      .orElse(() => okAsync(undefined));

type InitCommandDependencies = {
  octokit: Octokit;
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
            .andThen((answers) =>
              handleNewGitHubRepository(octokit)(answers).map((repoPr) =>
                makeInitResult(answers, repoPr),
              ),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
