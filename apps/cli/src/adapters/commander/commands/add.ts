import { getLogger } from "@logtape/logtape";
import chalk from "chalk";
/**
 * Add command - Scaffold new components into existing workspaces
 *
 * This module implements the `dx add` command which allows developers to scaffold
 * new components into their existing workspace following DevEx guidelines.
 *
 * Currently supported components:
 * - environment: Add a new deployment environment to the project
 */
import { Command } from "commander";
import { okAsync, ResultAsync } from "neverthrow";

import type { Payload as EnvironmentPayload } from "../../plop/generators/environment/index.js";

import {
  AuthorizationResult,
  AuthorizationService,
  requestAuthorizationInputSchema,
} from "../../../domain/authorization.js";
import { environmentShort } from "../../../domain/environment.js";
import { type GitHubService } from "../../../domain/github.js";
import { isAzureLocation, locationShort } from "../../azure/locations.js";
import {
  getPlopInstance,
  runDeploymentEnvironmentGenerator,
} from "../../plop/index.js";
import { exitWithError } from "../index.js";
import { checkPreconditions } from "./init.js";

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
    const envShort = environmentShort[name];

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

const addEnvironmentAction = (
  authorizationService: AuthorizationService,
  gitHubService: GitHubService,
): ResultAsync<AddResult, Error> =>
  checkPreconditions()
    .andThen(() =>
      ResultAsync.fromPromise(
        getPlopInstance(),
        (cause) => new Error("Failed to initialize plop", { cause }),
      ),
    )
    .andThen((plop) =>
      ResultAsync.fromPromise(
        runDeploymentEnvironmentGenerator(plop, gitHubService),
        (cause) =>
          new Error("Failed to run the deployment environment generator", {
            cause,
          }),
      ),
    )
    .andThen((payload) =>
      authorizeCloudAccounts(authorizationService)(payload).map(
        (authorizationPrs) => ({
          authorizationPrs,
        }),
      ),
    );

export type AddCommandDependencies = {
  authorizationService: AuthorizationService;
  gitHubService: GitHubService;
};

export const makeAddCommand = (deps: AddCommandDependencies): Command =>
  new Command()
    .name("add")
    .description("Add a new component to your workspace")
    .addCommand(
      new Command("environment")
        .description("Add a new deployment environment")
        .action(async function () {
          const result = await addEnvironmentAction(
            deps.authorizationService,
            deps.gitHubService,
          );
          if (result.isErr()) {
            exitWithError(this)(result.error);
          } else {
            displaySummary(result.value);
          }
        }),
    );
