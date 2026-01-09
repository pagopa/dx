import inquirer from "inquirer";
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
  environmentSchema,
  getInitializationStatus,
} from "../../../../domain/environment.js";
import * as azure from "../../../azure/locations.js";

type InquirerChoice<T> = inquirer.Separator | { name: string; value: T };

import { z } from "zod/v4";

import { workspaceSchema } from "../../../../domain/workspace.js";

const initSchema = z.object({
  cloudAccountsToInitialize: z.array(cloudAccountSchema),
  terraformBackend: z
    .object({
      cloudAccount: cloudAccountSchema,
    })
    .optional(),
});

const tagsSchema = z.record(z.string(), z.string().min(1));

export const payloadSchema = z.object({
  env: environmentSchema,
  init: initSchema.optional(),
  tags: tagsSchema,
  workspace: workspaceSchema,
});

export type Payload = z.infer<typeof payloadSchema>;

export interface PromptsDependencies {
  cloudAccountRepository: CloudAccountRepository;
  cloudAccountService: CloudAccountService;
}

const prompts: (deps: PromptsDependencies) => DynamicPromptsFunction =
  (deps) => async (inquirer) => {
    const payload = payloadSchema.parse(
      await inquirer.prompt([
        {
          choices: [
            { name: "PROD", value: "prod" },
            { name: "UAT", value: "uat" },
            { name: "DEV", value: "dev" },
          ],
          default: "prod",
          message: "Enter the name of the new deployment environment",
          name: "env.name",
          type: "list",
        },
        {
          choices: [{ name: "Microsoft Azure", value: "azure" }],
          default: ["azure"],
          message:
            "Which cloud provider should be configured for this environment?",
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
          message: "Select a cloud account to use for this environment",
          name: "env.cloudAccounts",
          type: "checkbox",
          validate: (value) =>
            Array.isArray(value) && value.length > 0
              ? true
              : "Please select a cloud account.",
        },
        {
          message: "Enter the prefix to use for resource names",
          name: "env.prefix",
          transformer: (value) => value.trim().toLowerCase(),
          type: "input",
          validate: (value) =>
            value.length >= 2 && value.length <= 4
              ? true
              : "Please enter a valid prefix.",
        },
        {
          message: "Enter the workspace domain to use for resource names",
          name: "workspace.domain",
          transformer: (value) => value.trim().toLowerCase(),
          type: "input",
        },
        {
          message: "What is the Cost Center for this project?",
          name: "tags.CostCenter",
          transformer: (value) => value.trim(),
          validate: (value) =>
            value.trim().length > 0 ? true : "Cost Center cannot be empty.",
        },
        {
          message: "What is the Management Team for this project?",
          name: "tags.ManagementTeam",
          transformer: (value) => value.trim(),
          validate: (value) =>
            value.trim().length > 0 ? true : "Management Team cannot be empty.",
        },
        {
          message: "What is the Business Unit for this project?",
          name: "tags.BusinessUnit",
          transformer: (value) => value.trim(),
          validate: (value) =>
            value.trim().length > 0 ? true : "Business Unit cannot be empty.",
        },
      ]),
    );

    const locations = await inquirer.prompt(
      payload.env.cloudAccounts.map((account) => ({
        choices: getCloudLocationChoices(azure.cloudRegions),
        message: `Select the default location for resources in cloud account ${account.displayName}`,
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

    if (initStatus.initialized) {
      return payload;
    }

    const missingRemoteBackend = initStatus.issues.some(
      (issue) => issue.type === "MISSING_REMOTE_BACKEND",
    );

    const initInput = await inquirer.prompt([
      {
        default: true,
        message:
          "The environment is not initialized. Do you want to initialize it now?",
        name: "init",
        type: "confirm",
      },
      {
        choices: getCloudAccountChoices(payload.env.cloudAccounts),
        message:
          "Select the cloud account to use for the remote Terraform backend",
        name: "terraformBackend.cloudAccount",
        type: "list",
        when: (answers) =>
          answers.init &&
          missingRemoteBackend &&
          payload.env.cloudAccounts.length > 1,
      },
    ]);

    assert.ok(initInput.init, "Can't proceed without initialization");

    payload.init = payloadSchema.shape.init.parse({
      cloudAccountsToInitialize: initStatus.issues
        .filter((issue) => issue.type === "CLOUD_ACCOUNT_NOT_INITIALIZED")
        .map((issue) => issue.cloudAccount),
      terraformBackend: missingRemoteBackend
        ? {
            cloudAccount:
              initInput.terraformBackend?.cloudAccount ||
              payload.env.cloudAccounts[0],
          }
        : undefined,
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

export default prompts;
