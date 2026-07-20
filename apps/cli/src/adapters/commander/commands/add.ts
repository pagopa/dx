import { getLogger } from "@logtape/logtape";
import chalk from "chalk";
/**
 * Add command - Scaffold new components into existing workspaces.
 *
 * This module implements the `dx add` command and keeps the CLI-specific flag
 * parsing/validation close to the Commander adapter. It turns supported flags
 * into prefilled answers for the plop generator so the command can run with a
 * mix of non-interactive inputs and guided prompts.
 */
import { Command, Option } from "commander";
import { okAsync, ResultAsync } from "neverthrow";
import { readFile } from "node:fs/promises";
import { z } from "zod/v4";

import type { CommandPresenter } from "../../../domain/command-presenter.js";
import type {
  InitialAnswers as DeploymentEnvironmentInitialAnswers,
  Payload as EnvironmentPayload,
} from "../../plop/generators/environment/index.js";
import type { CliEnv } from "../env.js";
import type { GlobalOptions } from "../global-options.js";

import {
  AuthorizationResult,
  AuthorizationService,
  requestAuthorizationInputSchema,
} from "../../../domain/authorization.js";
import { GitHubAuthFactory } from "../../../domain/dependencies.js";
import {
  environmentSchema,
  getEnvironmentShort,
} from "../../../domain/environment.js";
import { type GitHubService } from "../../../domain/github.js";
import {
  type AzureLocation,
  isAzureLocation,
  locationShort,
} from "../../azure/locations.js";
import { workspaceSchema } from "../../plop/generators/environment/prompts.js";
import {
  collectDeploymentEnvironmentPayload,
  getPlopInstance,
  runDeploymentEnvironmentActions,
} from "../../plop/index.js";
import { asError, reportCommandError } from "../command-errors.js";
import {
  createCommandPresenter,
  resolveOutputMode,
} from "../presenters/index.js";
import { runAddEnvironmentPreconditions } from "./init.js";

const appendOptionValue = (
  value: string,
  previous: string[] = [],
): string[] => [...previous, value];

const locationOptionSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const [rawAccountId, ...rawLocationParts] = value.split("=");
    const accountId = rawAccountId?.trim();
    const location = rawLocationParts.join("=").trim();

    if (!accountId || rawLocationParts.length === 0 || location.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location must use the format <subscription-id=region>.",
      });
      return z.NEVER;
    }

    if (!isAzureLocation(location)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unsupported Azure location "${location}".`,
      });
      return z.NEVER;
    }

    return { accountId, location };
  });

const addEnvironmentCommandOptionsSchema = z
  .object({
    account: z
      .array(z.string().trim().min(1, "Cloud account id cannot be empty"))
      .optional(),
    businessUnit: z
      .string()
      .trim()
      .min(1, "Business unit cannot be empty")
      .optional(),
    clientId: z.string().trim().min(1, "Client id cannot be empty").optional(),
    domain: workspaceSchema.shape.domain.optional(),
    installationId: z
      .string()
      .trim()
      .min(1, "Installation id cannot be empty")
      .optional(),
    location: z.array(locationOptionSchema).optional(),
    managementTeam: z
      .string()
      .trim()
      .min(1, "Management team cannot be empty")
      .optional(),
    name: environmentSchema.shape.name.optional(),
    prefix: environmentSchema.shape.prefix.optional(),
    privateKeyPath: z
      .string()
      .trim()
      .min(1, "Private key path cannot be empty")
      .optional(),
    runnerAppId: z
      .string()
      .trim()
      .min(1, "Runner app id cannot be empty")
      .optional(),
    yes: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.location && !value.account?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location mappings require at least one --account flag.",
        path: ["location"],
      });
      return;
    }

    if (value.account && value.location) {
      const selectedAccounts = new Set(value.account);
      for (const mapping of value.location) {
        if (!selectedAccounts.has(mapping.accountId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Location mapping references unknown account "${mapping.accountId}".`,
            path: ["location"],
          });
        }
      }
    }
  });

export type AddEnvironmentCommandOptions = z.infer<
  typeof addEnvironmentCommandOptionsSchema
>;

export const parseAddEnvironmentCommandOptions = (
  input: unknown,
): AddEnvironmentCommandOptions => {
  const result = addEnvironmentCommandOptionsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid add environment command options:\n${z.prettifyError(result.error)}`,
      {
        cause: result.error,
      },
    );
  }

  return result.data;
};

const buildBaseEnvironmentInitialAnswers = (
  options: AddEnvironmentCommandOptions,
): DeploymentEnvironmentInitialAnswers => {
  const env = {
    ...(options.name && { name: options.name }),
    ...(options.prefix && { prefix: options.prefix }),
    ...(options.account?.length && {
      cloudAccountIds: Array.from(new Set(options.account)),
    }),
    ...(options.location?.length && {
      locations: Object.fromEntries(
        options.location.map(({ accountId, location }) => [
          accountId,
          location as AzureLocation,
        ]),
      ),
    }),
  };

  const tags = {
    ...(options.businessUnit && { BusinessUnit: options.businessUnit }),
    ...(options.managementTeam && { ManagementTeam: options.managementTeam }),
  };

  return {
    ...(Object.keys(env).length > 0 && { env }),
    ...(Object.keys(tags).length > 0 && { tags }),
    ...(options.domain && { workspace: { domain: options.domain } }),
  };
};

export const getEnvironmentInitialAnswers = async (
  options: AddEnvironmentCommandOptions,
): Promise<DeploymentEnvironmentInitialAnswers> => {
  const initialAnswers = buildBaseEnvironmentInitialAnswers(options);
  const privateKey =
    options.privateKeyPath === undefined
      ? undefined
      : await readFile(options.privateKeyPath, "utf8").catch((cause) => {
          throw new Error(
            `Failed to read private key file at "${options.privateKeyPath}".`,
            { cause },
          );
        });

  // Fail fast on an empty (or whitespace-only) key file: the file contents are
  // never trimmed, so an empty value would otherwise skip the recovery prompt
  // and surface as an opaque schema error (or a silently invalid key) later.
  if (privateKey !== undefined && privateKey.trim().length === 0) {
    throw new Error(
      `Private key file at "${options.privateKeyPath}" is empty.`,
    );
  }

  // Prefill runner-app credentials only when at least one credential flag was
  // provided. Unspecified fields stay `undefined` on purpose so the generator
  // prompts for the missing pieces and validates the complete set later. With
  // no credential flag at all, leave this `undefined` to keep initialization
  // fully interactive.
  const runnerAppCredentials =
    options.runnerAppId === undefined &&
    options.clientId === undefined &&
    options.installationId === undefined &&
    privateKey === undefined
      ? undefined
      : {
          clientId: options.clientId,
          id: options.runnerAppId,
          installationId: options.installationId,
          key: privateKey,
        };

  return {
    ...initialAnswers,
    ...((options.yes || runnerAppCredentials) && {
      init: {
        ...(options.yes && { confirm: true }),
        ...(runnerAppCredentials && { runnerAppCredentials }),
      },
    }),
  };
};

/**
 * Authorize a Cloud Account (Azure Subscription, AWS Account, ...), creating a Pull Request for each account that requires authorization.
 */
export const authorizeCloudAccounts =
  (authorizationService: AuthorizationService) =>
  (
    envPayload: EnvironmentPayload,
  ): ResultAsync<AuthorizationResult[], never> => {
    const accountsToInitialize =
      envPayload.init?.cloudAccountsToInitialize ?? [];

    if (accountsToInitialize.length === 0) {
      return okAsync([]);
    }

    const logger = getLogger(["dx-cli", "add-environment"]);
    const { name, prefix } = envPayload.env;
    const envShort = getEnvironmentShort(name);

    const requestAll = async (): Promise<AuthorizationResult[]> => {
      const results: AuthorizationResult[] = [];

      for (const account of accountsToInitialize) {
        if (!isAzureLocation(account.defaultLocation)) {
          logger.warn(
            "Skipping authorization for {account}: unsupported location",
            { account: account.displayName },
          );
          continue;
        }

        const locShort = locationShort[account.defaultLocation];
        const input = requestAuthorizationInputSchema.safeParse({
          bootstrapIdentityId: `${prefix}-${envShort}-${locShort}-bootstrap-id-01`,
          envShort,
          prefix,
          repoName: envPayload.github.repo,
          repoOwner: envPayload.github.owner,
          subscriptionName: account.displayName,
        });

        if (!input.success) {
          logger.warn("Skipping authorization for {account}: invalid input", {
            account: account.displayName,
          });
          continue;
        }

        const result = await authorizationService.requestAuthorization(
          input.data,
        );

        result.match(
          (authResult) => results.push(authResult),
          (error) =>
            logger.warn("Authorization request failed for {account}: {error}", {
              account: account.displayName,
              error: error.message,
            }),
        );
      }

      return results;
    };

    return ResultAsync.fromPromise(requestAll(), () => []).orElse(() =>
      okAsync([]),
    );
  };

type AddResult = {
  authorizationPrs: AuthorizationResult[];
  payload: EnvironmentPayload;
};

const displaySummary = (result: AddResult) => {
  const { authorizationPrs } = result;
  console.log(chalk.green.bold("\nCloud environment created successfully!"));

  let step = 1;
  console.log(chalk.green.bold("\nNext Steps:"));
  const prsWithUrl = authorizationPrs.filter(
    (pr): pr is AuthorizationResult & { url: string } => pr.url != null,
  );
  if (prsWithUrl.length > 0) {
    console.log(`${step++}. Review the Azure authorization Pull Request(s):`);
    for (const authPr of prsWithUrl) {
      console.log(`   - ${chalk.underline(authPr.url)}`);
    }
  }
  console.log(
    `${step}. Visit ${chalk.underline("https://dx.pagopa.it/getting-started")} to deploy your first project\n`,
  );
};

/**
 * Routes the successful outcome through the presenter: JSON mode emits the
 * structured envelope while text mode renders the human-readable summary.
 */
const reportSummary =
  (presenter: CommandPresenter, outputMode: "json" | "text") =>
  (result: AddResult): void => {
    if (outputMode === "json") {
      presenter.reportResult(result);
    } else {
      displaySummary(result);
    }
  };

const trackStep = <T, E>(
  presenter: CommandPresenter,
  name: string,
  task: () => Promise<T>,
  mapError: (cause: unknown) => E,
): ResultAsync<T, E> =>
  ResultAsync.fromPromise(presenter.trackStep(name, task), mapError);

const addEnvironmentAction = (
  authorizationService: AuthorizationService,
  gitHubService: GitHubService,
  presenter: CommandPresenter,
  initialAnswers: DeploymentEnvironmentInitialAnswers = {},
): ResultAsync<AddResult, Error> =>
  runAddEnvironmentPreconditions(presenter)
    .andThen(() =>
      trackStep(
        presenter,
        "Initializing environment generator...",
        getPlopInstance,
        asError("Failed to initialize plop"),
      ),
    )
    .andThen((plop) =>
      // The prompt phase must run outside trackStep: in text mode trackStep
      // renders a spinner that occupies the TTY and hides the prompts.
      ResultAsync.fromPromise(
        collectDeploymentEnvironmentPayload(
          plop,
          gitHubService,
          undefined,
          initialAnswers,
        ),
        asError("Failed to run the deployment environment generator"),
      ),
    )
    .andThen(({ generator, payload }) =>
      trackStep(
        presenter,
        "Creating environment...",
        () => runDeploymentEnvironmentActions(generator, payload),
        asError("Failed to create the deployment environment"),
      ),
    )
    .andThen((payload) =>
      authorizeCloudAccounts(authorizationService)(payload).map(
        (authorizationPrs) => ({
          authorizationPrs,
          payload,
        }),
      ),
    );

export const makeAddCommand = (
  requireGitHubAuth: GitHubAuthFactory,
  env: CliEnv,
): Command =>
  new Command()
    .name("add")
    .description("Add a new component to your workspace")
    .addCommand(
      new Command("environment")
        .description("Add a new deployment environment")
        .addOption(
          new Option(
            "--name <name>",
            "Environment name (dev, uat, prod, or tenant-qualified like cgn-prod)",
          ),
        )
        .addOption(
          new Option(
            "--account <subscription-id>",
            "Cloud account subscription id",
          ).argParser(appendOptionValue),
        )
        .addOption(
          new Option(
            "--location <subscription-id=region>",
            "Default Azure location for a selected account",
          ).argParser(appendOptionValue),
        )
        .addOption(new Option("--prefix <prefix>", "Environment prefix"))
        .addOption(new Option("--domain <domain>", "Workspace domain"))
        .addOption(
          new Option("--business-unit <business-unit>", "Business unit tag"),
        )
        .addOption(
          new Option(
            "--management-team <management-team>",
            "Management team tag",
          ),
        )
        .addOption(
          new Option(
            "-y, --yes",
            "Confirm environment initialization without prompting",
          ),
        )
        .addOption(
          new Option("--runner-app-id <runner-app-id>", "GitHub Runner App ID"),
        )
        .addOption(
          new Option("--client-id <client-id>", "GitHub Runner App Client ID"),
        )
        .addOption(
          new Option(
            "--installation-id <installation-id>",
            "GitHub Runner App Installation ID",
          ),
        )
        .addOption(
          new Option(
            "--private-key-path <private-key-path>",
            "Path to a local GitHub Runner App private key file",
          ),
        )
        .action(async function (options: unknown) {
          const { output } = this.optsWithGlobals<GlobalOptions>();
          const outputMode = resolveOutputMode(env, output);
          const presenter = createCommandPresenter(outputMode);

          await ResultAsync.fromPromise(
            Promise.resolve().then(() =>
              parseAddEnvironmentCommandOptions(options),
            ),
            (cause) =>
              cause instanceof Error
                ? cause
                : new Error("Failed to parse add environment command options", {
                    cause,
                  }),
          )
            .andThen((addEnvironmentOptions) =>
              ResultAsync.fromPromise(
                getEnvironmentInitialAnswers(addEnvironmentOptions),
                (cause) =>
                  cause instanceof Error
                    ? cause
                    : new Error(
                        "Failed to load add environment initial answers",
                        {
                          cause,
                        },
                      ),
              ).andThen((initialAnswers) =>
                requireGitHubAuth().andThen(
                  ({ authorizationService, gitHubService }) =>
                    addEnvironmentAction(
                      authorizationService,
                      gitHubService,
                      presenter,
                      initialAnswers,
                    ),
                ),
              ),
            )
            .match(
              reportSummary(presenter, outputMode),
              reportCommandError(this, presenter, outputMode),
            );
        }),
    );
