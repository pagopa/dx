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
  repository?: Repository;
};

class Repository {
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
  const { csp, repository } = initResult;
  console.log(chalk.green.bold("\nWorkspace created successfully!"));
  console.log(`- Cloud Service Provider: ${chalk.cyan(csp.name)}`);
  console.log(`- CSP location: ${chalk.cyan(csp.location)}`);

  if (repository) {
    console.log(`- Name: ${chalk.cyan(repository.name)}`);
    console.log(`- GitHub Repository: ${chalk.cyan(repository.url)}\n`);
  } else {
    console.log(
      chalk.yellow(
        `\n⚠️  GitHub repository may not have been created automatically.`,
      ),
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

const initializeGitRepository = (cwd: string, { name, owner }: Repository) => {
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
    await git$`git remote add origin git@github.com:${owner}/${name}.git`;
    await git$`git push -u origin main`;
    await git$`git switch -c ${branchName}}`;
    await git$`git add .`;
    await git$`git commit --no-gpg-sign -m "Scaffold workspace"`;
    await git$`git push -u origin ${branchName}`;
  };

  return withSpinner(
    "Pushing code to GitHub...",
    "Code pushed to GitHub successfully!",
    "Failed to push code to GitHub.",
    pushToOrigin(),
  ).map(() => branchName);
};

const pushLocalChangesToRemoteRepository = (
  repository: Repository,
): ResultAsync<Repository, Error> => {
  const repoFolder = path.resolve(repository.name);
  return initializeGitRepository(repoFolder, repository).map(() => repository);
};

// TODO: Open PR on created repository with the generated code
const handleNewGitHubRepository = (
  answers: Answers,
): ResultAsync<Repository, Error> =>
  createRemoteRepository(answers).andThen(pushLocalChangesToRemoteRepository);

const makeInitResult = (
  answers: Answers,
  repository: Repository,
): InitResult => {
  const csp = {
    location:
      answers.csp === "azure" ? answers.azureLocation : answers.awsRegion,
    name: answers.csp,
  };
  return {
    csp,
    repository,
  };
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
              handleNewGitHubRepository(answers).map((repository) =>
                makeInitResult(answers, repository),
              ),
            )
            .match(displaySummary, exitWithError(this));
        }),
    );
