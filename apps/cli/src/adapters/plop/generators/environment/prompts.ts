import inquirer, { DistinctQuestion } from "inquirer";
import { type DynamicPromptsFunction } from "node-plop";
import * as assert from "node:assert/strict";

import {
  CloudAccount,
  CloudAccountRepository,
  cloudAccountSchema,
  CloudAccountService,
  CloudRegion,
} from "../../../../domain/cloud-account.js";
import {
  EnvironmentInitStatus,
  environmentSchema,
  getInitializationStatus,
  hasUserPermissionToInitialize,
} from "../../../../domain/environment.js";
import * as azure from "../../../azure/locations.js";

type InquirerChoice<T> = inquirer.Separator | { name: string; value: T };

import { getLogger } from "@logtape/logtape";
import { z } from "zod/v4";

import {
  GitHubRepo,
  githubRepoSchema,
} from "../../../../domain/github-repo.js";
import { githubAppCredentialsSchema } from "../../../../domain/github.js";
import { getGithubRepo } from "../../../github/github-repo.js";

const initSchema = z.object({
  cloudAccountsToInitialize: z.array(cloudAccountSchema),
  runnerAppCredentials: githubAppCredentialsSchema.optional(),
  terraformBackend: z
    .object({
      cloudAccount: cloudAccountSchema,
    })
    .optional(),
});

type InitPayload = z.infer<typeof initSchema>;

const tagsSchema = z.record(z.string(), z.string().min(1));

export const workspaceSchema = z.object({
  domain: z.string().default(""),
});

export const payloadSchema = z.object({
  env: environmentSchema,
  github: githubRepoSchema,
  init: initSchema.optional(),
  tags: tagsSchema,
  workspace: workspaceSchema,
});

export type Payload = z.infer<typeof payloadSchema>;

export type PromptsDependencies = {
  cloudAccountRepository: CloudAccountRepository;
  cloudAccountService: CloudAccountService;
  github?: GitHubRepo;
};

/* eslint-disable max-lines-per-function */
const prompts: (deps: PromptsDependencies) => DynamicPromptsFunction =
  (deps) => async (inquirer) => {
    const logger = getLogger(["gen", "env"]);
    const github = deps.github ?? (await getGithubRepo());
    assert.ok(github, "This generator only works inside a GitHub repository.");
    logger.debug("github repo {github}", { github });
    const answers = await inquirer.prompt([
      {
        choices: [
          { name: "PROD", value: "prod" },
          { name: "UAT", value: "uat" },
          { name: "DEV", value: "dev" },
        ],
        default: "prod",
        message: "Environment name",
        name: "env.name",
        type: "list",
      },
      {
        choices: [{ name: "Microsoft Azure", value: "azure" }],
        default: ["azure"],
        message: "Cloud provider(s)",
        name: "csp",
        type: "checkbox",
        validate: (value) =>
          Array.isArray(value) && value.length > 0
            ? true
            : "Please select at least one cloud provider.",
      },
      {
        choices: async () =>
          getCloudAccountChoices(await deps.cloudAccountRepository.list()),
        loop: false,
        message: "Account(s)",
        name: "env.cloudAccounts",
        type: "checkbox",
        validate: (value) =>
          Array.isArray(value) && value.length > 0
            ? true
            : "Please select a cloud account.",
      },
      {
        message: "Prefix (2-4 characters)",
        name: "env.prefix",
        transformer: (value) => value.trim().toLowerCase(),
        type: "input",
        validate: (value) =>
          value.length >= 2 && value.length <= 4
            ? true
            : "Please enter a valid prefix.",
      },
      {
        message: "Domain (optional)",
        name: "workspace.domain",
        transformer: (value) => value.trim().toLowerCase(),
        type: "input",
      },
      {
        choices: [
          {
            name: "TECNOLOGIA E SERVIZI",
            value: "TS000",
          },
        ],
        default: "TS000 - Tecnologia e Servizi",
        message: "Cost center",
        name: "tags.CostCenter",
        type: "list",
        validate: (value) =>
          Array.isArray(value) && value.length > 0
            ? true
            : "Please select a Cost Center.",
      },
      {
        filter: (value) => value.trim(),
        message: "Business unit",
        name: "tags.BusinessUnit",
        validate: (value) =>
          value.length > 0 ? true : "Business Unit cannot be empty.",
      },
      {
        filter: (value) => value.trim(),
        message: "Management team",
        name: "tags.ManagementTeam",
        validate: (value) =>
          value.length > 0 ? true : "Management Team cannot be empty.",
      },
    ]);

    const payload = payloadSchema.parse({ ...answers, github });

    const locations = await inquirer.prompt(
      payload.env.cloudAccounts.map((account) => ({
        choices: getCloudLocationChoices(azure.cloudRegions),
        default: azure.defaultLocation,
        message: `Default location for ${account.displayName}`,
        name: account.id,
        type: "list",
      })),
    );
    payload.env.cloudAccounts.forEach((account) => {
      const location = locations[account.id];
      if (location) {
        account.defaultLocation = location;
      }
    });

    const initStatus = await getInitializationStatus(
      deps.cloudAccountService,
      payload.env,
    );

    logger.debug("initialization status {initStatus}", { initStatus });

    if (initStatus.initialized) {
      return payload;
    }

    const initConfirm = await inquirer.prompt({
      default: true,
      message:
        "The environment is not initialized. Do you want to initialize it now?",
      name: "init",
      type: "confirm",
    });

    assert.ok(initConfirm.init, "Can't proceed without initialization");

    assert.ok(
      await hasUserPermissionToInitialize(
        deps.cloudAccountService,
        payload.env,
      ),
      "You don't have permission to initialize this environment. Ask your Engineering Leader to initialize it for you.",
    );

    const missingRemoteBackend = initStatus.issues.some(
      (issue) => issue.type === "MISSING_REMOTE_BACKEND",
    );

    const questions: DistinctQuestion[] = [];

    let terraformBackend: InitPayload["terraformBackend"];

    if (missingRemoteBackend) {
      if (payload.env.cloudAccounts.length === 1) {
        terraformBackend = {
          cloudAccount: payload.env.cloudAccounts[0],
        };
      } else {
        questions.push({
          choices: getCloudAccountChoices(payload.env.cloudAccounts),
          message: "Cloud Account to use for the remote Terraform backend",
          name: "terraformBackend.cloudAccount",
          type: "list",
        });
      }
    }

    if (missingRemoteBackend && payload.env.cloudAccounts.length > 1) {
      questions.push({
        choices: getCloudAccountChoices(payload.env.cloudAccounts),
        message: "Cloud Account to use for the remote Terraform backend",
        name: "terraformBackend.cloudAccount",
        type: "list",
      });
    }

    const cloudAccountsNotInitialized = initStatus.issues.some(
      (issue) => issue.type === "CLOUD_ACCOUNT_NOT_INITIALIZED",
    );

    let runnerAppCredentials: InitPayload["runnerAppCredentials"];

    if (cloudAccountsNotInitialized) {
      questions.push(
        {
          filter: (value) => value.trim(),
          message: "GitHub Runner App ID",
          name: "runnerAppCredentials.id",
          type: "input",
          validate: (value) => value.length > 0,
        },
        {
          filter: (value) => value.trim(),
          message: "GitHub Runner App Installation ID",
          name: "runnerAppCredentials.installationId",
          type: "input",
          validate: (value) => value.length > 0,
        },
        {
          filter: (value) => value.trim(),
          message: "GitHub Runner App Private Key",
          name: "runnerAppCredentials.key",
          type: "editor",
          validate: (value) => value.length > 0,
        },
      );
    }

    const initInput = await inquirer.prompt(questions);

    if (initInput.runnerAppCredentials) {
      runnerAppCredentials = initInput.runnerAppCredentials;
    }

    if (initInput.terraformBackend) {
      terraformBackend = initInput.terraformBackend;
    }

    payload.init = payloadSchema.shape.init.parse({
      cloudAccountsToInitialize: getCloudAccountToInitialize(initStatus),
      runnerAppCredentials,
      terraformBackend,
    });

    return payload;
  };

// Creates Inquirer choices, prioritizing those that match the env prefix
export const getCloudAccountChoices = (
  cloudAccounts: CloudAccount[],
): InquirerChoice<CloudAccount>[] =>
  cloudAccounts.map((account) => ({
    name: `${account.displayName}`,
    value: account,
  }));

export const getCloudLocationChoices = (
  regions: CloudRegion[],
): InquirerChoice<CloudRegion["name"]>[] =>
  regions.map((r) => ({ name: r.displayName, value: r.name }));

export const getCloudAccountToInitialize = (
  initStatus: EnvironmentInitStatus & { initialized: false },
) =>
  initStatus.issues
    .filter((issue) => issue.type === "CLOUD_ACCOUNT_NOT_INITIALIZED")
    .map((issue) => issue.cloudAccount);

export default prompts;
