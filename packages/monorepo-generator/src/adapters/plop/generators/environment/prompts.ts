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
  hasUserPermissionToInitialize,
} from "../../../../domain/environment.js";
import * as azure from "../../../azure/locations.js";

type InquirerChoice<T> = inquirer.Separator | { name: string; value: T };

import { getLogger } from "@logtape/logtape";
import { z } from "zod/v4";

import { githubRepoSchema } from "../../../../domain/github-repo.js";
import { workspaceSchema } from "../../../../domain/workspace.js";
import { getGithubRepo } from "../../../github/github-repo.js";

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
  github: githubRepoSchema,
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
    const logger = getLogger(["gen", "env"]);

    const github = await getGithubRepo();

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
        message: "Business unit",
        name: "tags.BusinessUnit",
        transformer: (value) => value.trim(),
        validate: (value) =>
          value.trim().length > 0 ? true : "Business Unit cannot be empty.",
      },
      {
        message: "Management team",
        name: "tags.ManagementTeam",
        transformer: (value) => value.trim(),
        validate: (value) =>
          value.trim().length > 0 ? true : "Management Team cannot be empty.",
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

    assert.ok(
      await hasUserPermissionToInitialize(
        deps.cloudAccountService,
        payload.env,
      ),
      "You don't have permission to initialize this environment. Ask to your Engineering Leader to initialize it for you.",
    );

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
        message: "Cloud Account to use for the remote Terraform backend",
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
