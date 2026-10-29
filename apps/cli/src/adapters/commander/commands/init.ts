import { getLogger } from "@logtape/logtape";
import chalk from "chalk";
import { Command, Option } from "commander";
import { $, ExecaError } from "execa";
import inquirer from "inquirer";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import * as path from "node:path";
import { z } from "zod";

import type { CommandPresenter } from "../../../domain/command-presenter.js";
import type { CliEnv } from "../env.js";
import type { GlobalOptions } from "../global-options.js";

import { GitHubAuthFactory } from "../../../domain/dependencies.js";
import {
  GitHubService,
  PullRequest,
  Repository,
} from "../../../domain/github.js";
import { tf$ } from "../../execa/terraform.js";
import { assertGitHubWorkflowAccess } from "../../github/git-auth.js";
import { assertGitHubPackagesAccess } from "../../github/packages.js";
import {
  initTerraformProjects,
  REPOSITORY_PROJECT,
} from "../../plop/actions/init-terraform-projects.js";
import { Payload as MonorepoPayload } from "../../plop/generators/monorepo/index.js";
import {
  collectMonorepoPayload,
  getPlopInstance,
  runMonorepoActions,
} from "../../plop/index.js";
import { asError, reportCommandError } from "../command-errors.js";
import { toErrorMessage } from "../error-reporting.js";
import {
  createCommandPresenter,
  resolveOutputMode,
} from "../presenters/index.js";

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

type InitActionContext = {
  gitHubService: GitHubService;
  initialAnswers?: InitInitialAnswers;
  presenter: CommandPresenter;
};

type InitInitialAnswers = Partial<MonorepoPayload> & {
  publishToGitHub?: boolean;
};

type LocalWorkspace = {
  branchName: string;
  repository: Repository;
};

type RepositoryPullRequest = {
  pr?: PullRequest;
  repository: Repository;
};

const trackStep = <T, E>(
  presenter: CommandPresenter,
  name: string,
  task: () => Promise<T>,
  mapError: (cause: unknown) => E,
): ResultAsync<T, E> =>
  ResultAsync.fromPromise(presenter.trackStep(name, task), mapError);

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

const checkTerraformCli = () => tf$`terraform -version`;

const trackTerraformCliIsInstalled = (presenter: CommandPresenter) =>
  trackStep(
    presenter,
    "Checking Terraform installation...",
    checkTerraformCli,
    asError(
      "Please install terraform CLI before running this command. If you use tfenv, run: tfenv install latest && tfenv use latest",
    ),
  );

const checkMise = () => tf$`mise --version`;

const trackMiseIsInstalled = (presenter: CommandPresenter) =>
  trackStep(
    presenter,
    "Checking mise installation...",
    checkMise,
    asError(
      "Please install mise before running this command. See https://mise.jdx.dev/installing-mise.html",
    ),
  );

/**
 * Verifies the GitHub credentials can read the DX packages from GitHub Packages.
 *
 * The probe fails with its own actionable message (the `read:packages` scope is
 * a prerequisite), so the mapper only guards against non-Error rejections.
 */
const mapGitHubPackagesError = (cause: unknown): Error =>
  cause instanceof Error
    ? cause
    : new Error(
        "Failed to verify access to the DX packages on GitHub Packages.",
        { cause },
      );

/**
 * Probes GitHub Packages before the scaffold is generated: without the
 * `read:packages` scope the bootstrap would only fail after the workspace has
 * already been scaffolded.
 */
const trackGitHubPackagesAccess = (presenter: CommandPresenter) =>
  trackStep(
    presenter,
    "Checking GitHub Packages access...",
    assertGitHubPackagesAccess,
    mapGitHubPackagesError,
  );

const azureAccountSchema = z.object({
  user: z.object({
    name: z.string().min(1),
  }),
});

const AZ_LOGIN_REQUIRED_MESSAGE =
  "Please log in to Azure CLI using `az login` before running this command.";

const mapAzAccessError = (cause: unknown): Error =>
  new Error(toErrorMessage(cause), { cause });

const parseAzureAccountOutput = (stdout: string): string => {
  let parsedOutput: unknown;

  try {
    parsedOutput = JSON.parse(stdout);
  } catch (cause) {
    throw new Error("Azure CLI returned invalid account JSON.", { cause });
  }

  const result = azureAccountSchema.safeParse(parsedOutput);
  if (!result.success) {
    throw new Error("Azure CLI returned an unexpected account payload.", {
      cause: result.error,
    });
  }

  return result.data.user.name;
};

const ensureAzLogin = async (): Promise<string> => {
  const { stdout } = await tf$`az account show`.catch((cause: unknown) => {
    throw asError(AZ_LOGIN_REQUIRED_MESSAGE)(cause);
  });
  // `az account show` reads the cached CLI context, but `az group list`
  // fails when the current session token has expired.
  await tf$`az group list`.catch((cause: unknown) => {
    throw mapAzAccessError(cause);
  });

  return parseAzureAccountOutput(stdout);
};

const mapAzLoginCheckError = (cause: unknown): Error =>
  cause instanceof Error
    ? cause
    : new Error("Failed to check Azure CLI login status.", { cause });

const trackAzLogin = (presenter: CommandPresenter) =>
  trackStep(
    presenter,
    "Checking Azure login status...",
    ensureAzLogin,
    mapAzLoginCheckError,
  );

// TODO(CES-1810): Make these checks concurrent to speed up the preconditions check phase
export const runInitPreconditions = (presenter: CommandPresenter) =>
  trackGitHubPackagesAccess(presenter)
    .andThen(() => trackTerraformCliIsInstalled(presenter))
    .andThen(() => trackMiseIsInstalled(presenter));

// TODO(CES-1810): Make these checks concurrent to speed up the preconditions check phase
export const runAddEnvironmentPreconditions = (presenter: CommandPresenter) =>
  trackTerraformCliIsInstalled(presenter)
    .andThen(() => trackMiseIsInstalled(presenter))
    .andThen(() => trackAzLogin(presenter));

const DEFAULT_GITHUB_PUBLISH_CONFIRMATION = true;

export const initCommandOptionsSchema = z.object({
  description: z.string().optional(),
  name: z.string().trim().min(1, "Repository name cannot be empty").optional(),
  owner: z.string().trim().min(1, "GitHub owner cannot be empty").optional(),
  publish: z.boolean().optional(),
});

export type InitCommandOptions = z.infer<typeof initCommandOptionsSchema>;

export const parseInitCommandOptions = (input: unknown): InitCommandOptions => {
  const result = initCommandOptionsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid init command options:\n${z.prettifyError(result.error)}`,
      {
        cause: result.error,
      },
    );
  }

  return result.data;
};

export const getMonorepoInitialAnswers = ({
  description,
  name,
  owner,
  publish,
}: InitCommandOptions): InitInitialAnswers => {
  const initialAnswers: InitInitialAnswers = {};

  if (description) {
    initialAnswers.repoDescription = description;
  }

  if (owner) {
    initialAnswers.repoOwner = owner;
  }

  if (name) {
    initialAnswers.repoName = name;
  }

  if (typeof publish === "boolean") {
    initialAnswers.publishToGitHub = publish;
  }

  return initialAnswers;
};

const formatTerraformFailureDetails = (cause: unknown): string => {
  const details =
    cause instanceof ExecaError
      ? [cause.shortMessage, cause.stderr]
      : [toErrorMessage(cause)];

  return details
    .filter(
      (detail): detail is string =>
        typeof detail === "string" && detail.trim().length > 0,
    )
    .map((detail) => detail.trim())
    .join("\n");
};

const mapTerraformFailure =
  (message: string) =>
  (cause: unknown): Error => {
    const details = formatTerraformFailureDetails(cause);
    const error = new Error([message, details].filter(Boolean).join("\n"), {
      cause,
    });

    getLogger(["dx-cli", "init"]).error(error.message);
    return error;
  };

/**
 * Initializes the Terraform project of the repository root, so the provider and
 * module lock files are part of the scaffold commit.
 *
 * The initialization is delegated to the Nx `init` target: a plain
 * `terraform init` would lock the providers of the current platform only, while
 * the validation workflow initializes the same project with a frozen lockfile.
 *
 * Only the repository root is initialized, never the environments already
 * present in the repository: they need access to their own backend.
 */
const initializeRepositoryTerraform = (): Promise<void> =>
  initTerraformProjects([REPOSITORY_PROJECT]);

const createRemoteRepositoryWithPresenter =
  (presenter: CommandPresenter) =>
  (repository: Repository): ResultAsync<Repository, Error> => {
    const repo$ = tf$({ cwd: path.resolve("infra", "repository") });

    const applyRepositoryTerraform = () => repo$`terraform apply -auto-approve`;

    return trackStep(
      presenter,
      "Creating GitHub repository...",
      applyRepositoryTerraform,
      mapTerraformFailure(
        "Terraform apply failed while creating the GitHub repository.",
      ),
    ).map(() => repository);
  };
/**
 * Exit code returned by `git remote add` when a remote with the requested name
 * already exists. `git remote` documents this dedicated status code, so we can
 * turn it into actionable guidance instead of a generic failure message.
 *
 * See https://git-scm.com/docs/git-remote#_exit_status
 */
const GIT_REMOTE_ALREADY_EXISTS_EXIT_CODE = 3;
const DEFAULT_SCAFFOLD_GIT_USER_EMAIL = "dx-pagopa-github-bot@pagopa.it";
const DEFAULT_SCAFFOLD_GIT_USER_NAME = "dx-pagopa-bot";

/**
 * Translates a failure of the git remote setup step into an actionable error.
 *
 * When `git remote add origin` exits with code 3 the remote already exists,
 * which is a recoverable situation: the message tells the user how to fix it.
 * The original ExecaError is preserved as `cause` so `--verbose` still surfaces
 * the exit code and git's own stderr.
 */
export const mapGitRemoteAddError = (cause: unknown): Error => {
  if (
    cause instanceof ExecaError &&
    cause.exitCode === GIT_REMOTE_ALREADY_EXISTS_EXIT_CODE
  ) {
    return new Error(
      "A git remote named 'origin' already exists. Remove it with `git remote remove origin` and run the command again, or start from a clean directory.",
      { cause },
    );
  }
  return new Error(
    "Failed to set up the local git repository and its 'origin' remote.",
    { cause },
  );
};

const configureGitRemoteWithPresenter =
  (presenter: CommandPresenter) =>
  (repository: Repository): ResultAsync<Repository, Error> =>
    trackStep(
      presenter,
      "Configuring the git remote...",
      async () => {
        const git$ = $({ shell: true });
        await git$`git init`;
        await git$`git remote add origin ${repository.origin}`;
      },
      mapGitRemoteAddError,
    ).map(() => repository);

const trackGitHubWorkflowAccess =
  (presenter: CommandPresenter) =>
  (repository: Repository): ResultAsync<Repository, Error> =>
    trackStep(
      presenter,
      "Checking GitHub workflow permissions...",
      assertGitHubWorkflowAccess,
      (cause) =>
        cause instanceof Error
          ? cause
          : new Error("Failed to check Git's workflow permissions.", { cause }),
    ).map(() => repository);

const pushGitRepositoryWithPresenter =
  (presenter: CommandPresenter) => (repository: Repository) => {
    const branchName = "features/scaffold-workspace";
    const git$ = $({
      shell: true,
    });
    const gitRead$ = $({
      reject: false,
      shell: true,
    });
    const readGitConfigValue = async (
      key: "user.email" | "user.name",
    ): Promise<string | undefined> => {
      const result = await gitRead$`git config --get ${key}`;
      const value = result.stdout.trim();
      const stderr = (result.stderr ?? "").trim();
      const isMissingValue =
        result.exitCode === 1 && value === "" && stderr === "";

      if (isMissingValue || value === "") {
        return undefined;
      }

      if (result.exitCode !== 0) {
        throw new Error(
          stderr === "" ? `Failed to read git config ${key}` : stderr,
          { cause: result },
        );
      }

      return value;
    };
    const commitScaffold = async () => {
      const [configuredGitUserName, configuredGitUserEmail] = await Promise.all(
        [readGitConfigValue("user.name"), readGitConfigValue("user.email")],
      );
      const hasConfiguredGitIdentity =
        configuredGitUserName !== undefined &&
        configuredGitUserEmail !== undefined;

      if (hasConfiguredGitIdentity) {
        await git$`git commit --no-gpg-sign -m "Scaffold workspace"`;
      } else {
        // `git -c` applies the fallback identity only to this scaffold commit, so
        // the generated repository does not persist bot defaults in local config.
        await git$`git -c user.name=${DEFAULT_SCAFFOLD_GIT_USER_NAME} -c user.email=${DEFAULT_SCAFFOLD_GIT_USER_EMAIL} commit --no-gpg-sign -m "Scaffold workspace"`;
      }
    };
    const pushToOrigin = async () => {
      await git$`git fetch origin main`;
      await git$`git checkout -b ${branchName}`;
      // Terraform creates `main` with an initial README commit.
      // Reset to `origin/main` so this branch is based on the remote default branch,
      // while keeping the scaffolded local files in the working tree for a clean PR diff.
      await git$`git reset origin/main`;
      await git$`git add .`;
      await commitScaffold();
      await git$`git push -u origin ${branchName}`;
    };
    return trackStep(
      presenter,
      "Pushing code to GitHub...",
      pushToOrigin,
      asError("Failed to push code to GitHub."),
    ).map(() => ({ branchName, repository }));
  };

const createPullRequestWithPresenter =
  ({ gitHubService, presenter }: InitActionContext) =>
  ({
    branchName,
    repository,
  }: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> =>
    trackStep(
      presenter,
      "Creating Pull Request...",
      () =>
        gitHubService.createPullRequest({
          base: "main",
          body: "This PR contains the scaffolded monorepo structure.",
          head: branchName,
          owner: repository.owner,
          repo: repository.name,
          title: "Scaffold repository",
        }),
      asError("Failed to create Pull Request."),
    )
      // If PR creation fails, don't block the workflow
      .orElse(() => okAsync(undefined));

const handleNewGitHubRepositoryWithPresenter =
  (context: InitActionContext) =>
  (payload: MonorepoPayload): ResultAsync<RepositoryPullRequest, Error> =>
    configureGitRemoteWithPresenter(context.presenter)(
      new Repository(payload.repoName, payload.repoOwner),
    )
      .andThen(trackGitHubWorkflowAccess(context.presenter))
      .andThen(createRemoteRepositoryWithPresenter(context.presenter))
      .andThen(pushGitRepositoryWithPresenter(context.presenter))
      .andThen((localWorkspace) =>
        createPullRequestWithPresenter(context)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
        })),
      );

const handleGeneratorError = (err: unknown) => {
  const logger = getLogger(["dx-cli", "init"]);
  if (err instanceof Error) {
    logger.error(err.message);
  }
  return new Error("Failed to run the generator", { cause: err });
};

/**
 * Resolves whether the scaffolded repository should be published to GitHub.
 *
 * When the caller already knows the answer (e.g. the user passed `--publish`
 * on the command line), that value is used as-is and no prompt is shown. When
 * the preference is left undefined (flag omitted), the user is asked
 * interactively.
 */
export const confirmGitHubRepoCreation = (
  payload: MonorepoPayload,
  publishPreference?: boolean,
): ResultAsync<boolean, Error> =>
  // A preference provided up-front (via `--publish`) skips the interactive prompt.
  publishPreference !== undefined
    ? okAsync(publishPreference)
    : ResultAsync.fromPromise(
        inquirer.prompt({
          default: DEFAULT_GITHUB_PUBLISH_CONFIRMATION,
          message: `The project is created on ${chalk.green(payload.repoName)}. Would you like to publish it to GitHub at ${chalk.green(`${payload.repoOwner}/${payload.repoName}`)} now?`,
          name: "confirm",
          type: "confirm",
        }),
        (cause) =>
          new Error("Failed to read GitHub publish confirmation", { cause }),
      ).andThen((answer) => {
        const parsedAnswer = z
          .object({
            confirm: z.boolean(),
          })
          .safeParse(answer);
        if (!parsedAnswer.success) {
          return errAsync(
            new Error("Invalid GitHub publish confirmation", {
              cause: parsedAnswer.error,
            }),
          );
        }

        return okAsync(parsedAnswer.data.confirm);
      });

const runInitAction = ({
  gitHubService,
  initialAnswers = {},
  presenter,
}: InitActionContext): ResultAsync<SummaryInput, Error> => {
  const { publishToGitHub, ...monorepoInitialAnswers } = initialAnswers;

  return trackStep(
    presenter,
    "Initializing workspace generator...",
    getPlopInstance,
    asError("Failed to initialize plop"),
  )
    .andThen((plop) =>
      // The prompt phase must run outside trackStep: in text mode trackStep
      // renders a spinner that occupies the TTY and hides the prompts.
      ResultAsync.fromPromise(
        collectMonorepoPayload(plop, gitHubService, monorepoInitialAnswers),
        handleGeneratorError,
      ),
    )
    .andThen(({ generator, payload }) =>
      trackStep(
        presenter,
        "Scaffolding workspace...",
        () => runMonorepoActions(generator, payload),
        handleGeneratorError,
      ),
    )
    .andTee((payload) => {
      process.chdir(payload.repoName);
    })
    .andThen((payload) =>
      // The initialization runs before the GitHub publication: a generated
      // repository without lock files fails its own validation pipeline, so it
      // must be complete even when the publication is declined.
      trackStep(
        presenter,
        "Initializing Terraform projects...",
        initializeRepositoryTerraform,
        mapTerraformFailure(
          "Terraform init failed while initializing the scaffolded projects.",
        ),
      ).map(() => payload),
    )
    .andThen((payload) =>
      confirmGitHubRepoCreation(payload, publishToGitHub).andThen<
        SummaryInput,
        Error
      >((confirmed) =>
        confirmed
          ? handleNewGitHubRepositoryWithPresenter({
              gitHubService,
              presenter,
            })(payload)
          : okAsync({ gitHubRepoCreationSkipped: true, payload }),
      ),
    );
};

const reportSummary =
  (presenter: CommandPresenter, outputMode: "json" | "text") =>
  (result: SummaryInput) => {
    if (outputMode === "json") {
      presenter.reportResult(result);
    } else {
      displaySummary(result);
    }
  };

export const makeInitCommand = (
  requireGitHubAuth: GitHubAuthFactory,
  env: CliEnv,
): Command =>
  new Command()
    .name("init")
    .description("Initialize a new DX workspace")
    .addOption(new Option("--name <name>", "Repository name"))
    .addOption(
      new Option(
        "--owner <owner>",
        "GitHub organization or user that will own the repository",
      ),
    )
    .addOption(
      new Option("--description <description>", "Repository description"),
    )
    .addOption(
      new Option(
        "--publish",
        "Publish the scaffolded repository to GitHub without prompting",
      ).default(undefined),
    )
    .action(async function (options: unknown) {
      const { output } = this.optsWithGlobals<GlobalOptions>();
      const outputMode = resolveOutputMode(env, output);
      const presenter = createCommandPresenter(outputMode);

      await ResultAsync.fromPromise(
        Promise.resolve().then(() => parseInitCommandOptions(options)),
        (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Failed to parse init command options", { cause }),
      )
        .andThen((initOptions) =>
          runInitPreconditions(presenter)
            .andThen(() => requireGitHubAuth())
            .andThen((auth) =>
              runInitAction({
                gitHubService: auth.gitHubService,
                initialAnswers: getMonorepoInitialAnswers(initOptions),
                presenter,
              }),
            ),
        )
        .match(
          reportSummary(presenter, outputMode),
          reportCommandError(this, presenter, outputMode),
        );
    });
