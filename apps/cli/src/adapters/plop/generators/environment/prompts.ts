import chalk from "chalk";
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
import {
  type GitHubAppCredentials,
  githubAppCredentialsSchema,
} from "../../../../domain/github.js";
import { getGithubRepo } from "../../../github/github-repo.js";
import { validatePrompt } from "../../helpers/validate-prompt.js";

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

const workspaceDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Domain is required")
  .regex(
    /^[a-z0-9-]+$/,
    "Domain may contain only lowercase letters, numbers, and hyphens",
  );

export const workspaceSchema = z.object({
  domain: workspaceDomainSchema,
});

export const payloadSchema = z.object({
  env: environmentSchema,
  github: githubRepoSchema,
  init: initSchema.optional(),
  tags: tagsSchema,
  workspace: workspaceSchema,
});

export type Payload = z.infer<typeof payloadSchema>;

/**
 * Prefilled answers supplied up-front by the caller (e.g. CLI flags), used to
 * skip the matching prompts. Identifies cloud accounts by id and locations by
 * account id, since the full domain objects aren't available before resolving.
 */
export const initialAnswersSchema = z.object({
  env: z
    .object({
      cloudAccountIds: z.array(z.string().trim().min(1)).optional(),
      locations: z
        .record(z.string().min(1), z.enum(azure.locations))
        .optional(),
      name: environmentSchema.shape.name.optional(),
      prefix: environmentSchema.shape.prefix.optional(),
    })
    .optional(),
  init: z
    .object({
      confirm: z.boolean().optional(),
      runnerAppCredentials: githubAppCredentialsSchema.partial().optional(),
    })
    .optional(),
  tags: z
    .object({
      BusinessUnit: z.string().trim().min(1).optional(),
      ManagementTeam: z.string().trim().min(1).optional(),
    })
    .optional(),
  workspace: z
    .object({
      domain: workspaceSchema.shape.domain.optional(),
    })
    .optional(),
});

export type InitialAnswers = z.infer<typeof initialAnswersSchema>;

/**
 * Answers gathered from the interactive base prompts. Mirrors {@link initialAnswersSchema}
 * but holds the values produced by the prompt session: cloud accounts are full
 * domain objects (resolved from inquirer choices) rather than ids. Only questions
 * not already prefilled are asked, so every field is optional here too.
 */
const basePromptAnswersSchema = z.object({
  env: z
    .object({
      cloudAccounts: z.array(cloudAccountSchema).optional(),
      name: environmentSchema.shape.name.optional(),
      prefix: environmentSchema.shape.prefix.optional(),
    })
    .optional(),
  tags: z
    .object({
      BusinessUnit: z.string().trim().min(1).optional(),
      ManagementTeam: z.string().trim().min(1).optional(),
    })
    .optional(),
  workspace: z
    .object({
      domain: workspaceSchema.shape.domain.optional(),
    })
    .optional(),
});

export type PromptsDependencies = {
  cloudAccountRepository: CloudAccountRepository;
  cloudAccountService: CloudAccountService;
  github?: GitHubRepo;
  initialAnswers?: InitialAnswers;
};

type BasePromptAnswers = z.infer<typeof basePromptAnswersSchema>;

const DEFAULT_COST_CENTER = "TS000";

const resolveCloudAccounts = (
  availableCloudAccounts: CloudAccount[],
  initialAnswers: InitialAnswers,
): CloudAccount[] | undefined => {
  const cloudAccountIds = initialAnswers.env?.cloudAccountIds;
  if (cloudAccountIds === undefined) {
    return undefined;
  }

  return cloudAccountIds.map((cloudAccountId) => {
    const cloudAccount = availableCloudAccounts.find(
      (account) => account.id === cloudAccountId,
    );
    assert.ok(cloudAccount, `Cloud account "${cloudAccountId}" was not found.`);
    return { ...cloudAccount };
  });
};

const getBaseQuestions = (
  availableCloudAccounts: CloudAccount[],
  initialAnswers: InitialAnswers,
  selectedCloudAccounts: CloudAccount[] | undefined,
): DistinctQuestion[] => {
  const questions: DistinctQuestion[] = [];

  if (initialAnswers.env?.name === undefined) {
    questions.push({
      choices: [
        { name: "PROD", value: "prod" },
        { name: "UAT", value: "uat" },
        { name: "DEV", value: "dev" },
      ],
      default: "prod",
      message: "Environment name",
      name: "env.name",
      type: "list",
    });
  }

  if (selectedCloudAccounts === undefined) {
    questions.push({
      choices: getCloudAccountChoices(availableCloudAccounts),
      loop: false,
      message: "Account(s)",
      name: "env.cloudAccounts",
      type: "checkbox",
      validate: (value) =>
        Array.isArray(value) && value.length > 0
          ? true
          : "Please select a cloud account.",
    });
  }

  if (initialAnswers.env?.prefix === undefined) {
    questions.push({
      filter: (value: string) => value.trim().toLowerCase(),
      message: "Prefix (2-4 characters)",
      name: "env.prefix",
      type: "input",
      validate: validatePrompt(environmentSchema.shape.prefix),
    });
  }

  if (initialAnswers.workspace?.domain === undefined) {
    questions.push({
      filter: (value: string) => value.trim().toLowerCase(),
      message: "Domain",
      name: "workspace.domain",
      type: "input",
      validate: validatePrompt(workspaceSchema.shape.domain),
    });
  }

  if (initialAnswers.tags?.BusinessUnit === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "Business unit",
      name: "tags.BusinessUnit",
      validate: (value) =>
        value.length > 0 ? true : "Business Unit cannot be empty.",
    });
  }

  if (initialAnswers.tags?.ManagementTeam === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "Management team",
      name: "tags.ManagementTeam",
      validate: (value) =>
        value.length > 0 ? true : "Management Team cannot be empty.",
    });
  }

  return questions;
};

const getSelectedCloudAccounts = (
  answers: BasePromptAnswers,
  initialCloudAccounts: CloudAccount[] | undefined,
): CloudAccount[] => {
  const promptedCloudAccounts = answers.env?.cloudAccounts;
  const selectedCloudAccounts = initialCloudAccounts ?? promptedCloudAccounts;

  assert.ok(
    Array.isArray(selectedCloudAccounts) && selectedCloudAccounts.length > 0,
    "Please select a cloud account.",
  );

  return selectedCloudAccounts.map((cloudAccount) => ({ ...cloudAccount }));
};

const applyLocations = async (
  promptModule: typeof inquirer,
  selectedCloudAccounts: CloudAccount[],
  initialAnswers: InitialAnswers,
) => {
  const predefinedLocations = initialAnswers.env?.locations ?? {};
  const locationQuestions = selectedCloudAccounts
    .filter((account) => predefinedLocations[account.id] === undefined)
    .map((account) => ({
      choices: getCloudLocationChoices(azure.cloudRegions),
      default: azure.defaultLocation,
      message: `Default location for ${account.displayName}`,
      name: account.id,
      type: "list",
    }));

  const promptedLocations =
    locationQuestions.length === 0
      ? {}
      : await promptModule.prompt(locationQuestions);

  selectedCloudAccounts.forEach((account) => {
    const location =
      predefinedLocations[account.id] ?? promptedLocations[account.id];
    if (location !== undefined) {
      account.defaultLocation = location;
    }
  });
};

const parseInitialAnswers = (
  input: InitialAnswers | undefined,
): InitialAnswers => {
  const result = initialAnswersSchema.safeParse(input ?? {});
  assert.ok(
    result.success,
    "Invalid initial answers for the environment generator.",
  );
  return result.data;
};

const getRunnerAppCredentialQuestions = (
  initialRunnerAppCredentials: Partial<GitHubAppCredentials>,
): DistinctQuestion[] => {
  const questions: DistinctQuestion[] = [];

  if (initialRunnerAppCredentials.id === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "GitHub Runner App ID",
      name: "runnerAppCredentials.id",
      type: "input",
      validate: (value) => value.length > 0,
    });
  }

  if (initialRunnerAppCredentials.clientId === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "GitHub Runner App Client ID",
      name: "runnerAppCredentials.clientId",
      type: "input",
      validate: (value) => value.length > 0,
    });
  }

  if (initialRunnerAppCredentials.installationId === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "GitHub Runner App Installation ID",
      name: "runnerAppCredentials.installationId",
      type: "input",
      validate: (value) => value.length > 0,
    });
  }

  if (initialRunnerAppCredentials.key === undefined) {
    questions.push({
      filter: (value) => value.trim(),
      message: "GitHub Runner App Private Key",
      name: "runnerAppCredentials.key",
      type: "editor",
      validate: (value) => value.length > 0,
    });
  }

  return questions;
};

const mergeRunnerAppCredentials = (
  initialRunnerAppCredentials: Partial<GitHubAppCredentials>,
  promptedRunnerAppCredentials: Partial<GitHubAppCredentials> | undefined,
): InitPayload["runnerAppCredentials"] => {
  const runnerAppCredentials = {
    clientId:
      initialRunnerAppCredentials.clientId ??
      promptedRunnerAppCredentials?.clientId,
    id: initialRunnerAppCredentials.id ?? promptedRunnerAppCredentials?.id,
    installationId:
      initialRunnerAppCredentials.installationId ??
      promptedRunnerAppCredentials?.installationId,
    key: initialRunnerAppCredentials.key ?? promptedRunnerAppCredentials?.key,
  };

  if (
    Object.values(runnerAppCredentials).every((value) => value === undefined)
  ) {
    return undefined;
  }

  return githubAppCredentialsSchema.parse(runnerAppCredentials);
};

const collectBaseAnswers = async (
  promptModule: typeof inquirer,
  availableCloudAccounts: CloudAccount[],
  initialAnswers: InitialAnswers,
): Promise<{
  answers: BasePromptAnswers;
  initialCloudAccounts: CloudAccount[] | undefined;
}> => {
  const initialCloudAccounts = resolveCloudAccounts(
    availableCloudAccounts,
    initialAnswers,
  );
  const baseQuestions = getBaseQuestions(
    availableCloudAccounts,
    initialAnswers,
    initialCloudAccounts,
  );
  const promptAnswersResult = basePromptAnswersSchema.safeParse(
    baseQuestions.length === 0 ? {} : await promptModule.prompt(baseQuestions),
  );
  assert.ok(promptAnswersResult.success, "Invalid environment prompt answers.");

  return {
    answers: promptAnswersResult.data,
    initialCloudAccounts,
  };
};

const buildPayload = ({
  answers,
  github,
  initialAnswers,
  selectedCloudAccounts,
}: {
  answers: BasePromptAnswers;
  github: GitHubRepo;
  initialAnswers: InitialAnswers;
  selectedCloudAccounts: CloudAccount[];
}): Payload =>
  payloadSchema.parse({
    env: {
      cloudAccounts: selectedCloudAccounts,
      name: initialAnswers.env?.name ?? answers.env?.name,
      prefix: initialAnswers.env?.prefix ?? answers.env?.prefix,
    },
    github,
    tags: {
      BusinessUnit:
        initialAnswers.tags?.BusinessUnit ?? answers.tags?.BusinessUnit,
      CostCenter: DEFAULT_COST_CENTER,
      ManagementTeam:
        initialAnswers.tags?.ManagementTeam ?? answers.tags?.ManagementTeam,
    },
    workspace: {
      domain: initialAnswers.workspace?.domain ?? answers.workspace?.domain,
    },
  });

const prompts: (deps: PromptsDependencies) => DynamicPromptsFunction =
  (deps) => async (promptModule) => {
    const logger = getLogger(["gen", "env"]);
    const github = deps.github ?? (await getGithubRepo());
    assert.ok(github, "This generator only works inside a GitHub repository.");
    const initialAnswers = parseInitialAnswers(deps.initialAnswers);
    logger.debug("github repo {github}", { github });
    const availableCloudAccounts = await deps.cloudAccountRepository.list();
    const { answers, initialCloudAccounts } = await collectBaseAnswers(
      promptModule,
      availableCloudAccounts,
      initialAnswers,
    );
    const selectedCloudAccounts = getSelectedCloudAccounts(
      answers,
      initialCloudAccounts,
    );

    await applyLocations(promptModule, selectedCloudAccounts, initialAnswers);

    const payload = buildPayload({
      answers,
      github,
      initialAnswers,
      selectedCloudAccounts,
    });

    const initStatus = await getInitializationStatus(
      deps.cloudAccountService,
      payload.env,
    );

    logger.debug("initialization status {initStatus}", { initStatus });

    if (initStatus.initialized) {
      return payload;
    }

    console.log(formatInitializationDetails(initStatus));

    if (initialAnswers.init?.confirm !== true) {
      const initConfirm = await promptModule.prompt({
        default: true,
        message: `The environment "${payload.env.name}" is not initialized. Proceed with the setup above?`,
        name: "init",
        type: "confirm",
      });

      assert.ok(initConfirm.init, "Can't proceed without initialization");
    }

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

    const cloudAccountsNotInitialized = initStatus.issues.some(
      (issue) => issue.type === "CLOUD_ACCOUNT_NOT_INITIALIZED",
    );

    const initialRunnerAppCredentials =
      initialAnswers.init?.runnerAppCredentials ?? {};

    if (cloudAccountsNotInitialized) {
      questions.push(
        ...getRunnerAppCredentialQuestions(initialRunnerAppCredentials),
      );
    }

    const initInput =
      questions.length === 0 ? {} : await promptModule.prompt(questions);

    if (initInput.terraformBackend) {
      terraformBackend = initInput.terraformBackend;
    }

    const runnerAppCredentials = mergeRunnerAppCredentials(
      initialRunnerAppCredentials,
      initInput.runnerAppCredentials,
    );

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

/**
 * Build a human-readable description of the resources that will be created
 * when initializing an environment, so users see the side effects before
 * confirming. The exact resource names are intentionally omitted to avoid
 * coupling the prompt copy to internal naming conventions.
 */
export const formatInitializationDetails = (
  initStatus: EnvironmentInitStatus & { initialized: false },
): string => {
  const accountsToInit = getCloudAccountToInitialize(initStatus);
  const missingBackend = initStatus.issues.some(
    (issue) => issue.type === "MISSING_REMOTE_BACKEND",
  );

  const sections: string[] = [];

  for (const account of accountsToInit) {
    sections.push(
      [
        chalk.bold.cyan(`  Azure subscription "${account.displayName}":`),
        `    • Bootstrap resource group and managed identity with subscription-scoped roles`,
        `    • GitHub OIDC federated identity credential`,
        `    • GitHub environment secrets (ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID)`,
        `    • Common Key Vault storing the GitHub runner app credentials`,
      ].join("\n"),
    );
  }

  if (missingBackend) {
    sections.push(
      [
        chalk.bold.cyan(`  Terraform remote backend:`),
        `    • Azure resource group and Storage Account for the Terraform state`,
      ].join("\n"),
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return [
    "",
    chalk.bold("The following resources will be created:"),
    "",
    ...sections,
    "",
  ].join("\n");
};

export default prompts;
