import type { NodePlopAPI, PlopGenerator } from "plop";

import { AzureCliCredential } from "@azure/identity";
import { getLogger } from "@logtape/logtape";
import { Answers } from "inquirer";
import nodePlop from "node-plop";
import path from "node:path";
import { Octokit } from "octokit";
import { oraPromise } from "ora";

import { GitHubRepo } from "../../domain/github-repo.js";
import { GitHubService, RepositoryNotFoundError } from "../../domain/github.js";
import { AzureSubscriptionRepository } from "../azure/cloud-account-repository.js";
import { AzureCloudAccountService } from "../azure/cloud-account-service.js";
import createDeploymentEnvironmentGenerator, {
  PLOP_ENVIRONMENT_GENERATOR_NAME,
} from "../plop/generators/environment/index.js";
import createMonorepoGenerator, {
  Payload as MonorepoPayload,
  payloadSchema as monorepoPayloadSchema,
  PLOP_MONOREPO_GENERATOR_NAME,
} from "../plop/generators/monorepo/index.js";

export const setMonorepoGenerator = (plop: NodePlopAPI) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../templates/monorepo",
  );
  createMonorepoGenerator(plop, templatesPath, octokit);
};

const validatePayload = async (
  payload: MonorepoPayload,
  github: GitHubService,
) => {
  try {
    const repo = await github.getRepository(
      payload.repoOwner,
      payload.repoName,
    );
    throw new Error(`Repository ${repo.fullName} already exists.`);
  } catch (error) {
    if (!(error instanceof RepositoryNotFoundError)) {
      throw error;
    }
  }
};

export const getPlopInstance = async (): Promise<NodePlopAPI> => nodePlop();

const runActions = async (generator: PlopGenerator, payload: Answers) => {
  const logger = getLogger(["dx-cli", "init"]);
  const result = await generator.runActions(payload);
  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      logger.error(failure.message);
    }
    throw new Error("One or more actions failed during generation.");
  }
};

export const runMonorepoGenerator = async (
  plop: NodePlopAPI,
  githubService: GitHubService,
): Promise<MonorepoPayload> => {
  setMonorepoGenerator(plop);
  const generator = plop.getGenerator(PLOP_MONOREPO_GENERATOR_NAME);
  const answers = await generator.runPrompts();
  const payload = monorepoPayloadSchema.parse(answers);
  await validatePayload(payload, githubService);
  await oraPromise(runActions(generator, payload), {
    failText: "Failed to create workspace files.",
    successText: "Workspace files created successfully!",
    text: "Creating workspace files...",
  });
  return payload;
};

export const runDeploymentEnvironmentGenerator = async (
  plop: NodePlopAPI,
  github: GitHubRepo,
): Promise<void> => {
  setDeploymentEnvironmentGenerator(plop, github);
  const generator = plop.getGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME);
  const payload = await generator.runPrompts();
  await oraPromise(runActions(generator, payload), {
    failText: "Failed to create deployment environment",
    successText: "Environment created successfully!",
    text: "Creating environment...",
  });
};

export const setDeploymentEnvironmentGenerator = (
  plop: NodePlopAPI,
  github: GitHubRepo,
) => {
  const credential = new AzureCliCredential();
  const cloudAccountRepository = new AzureSubscriptionRepository(credential);
  const cloudAccountService = new AzureCloudAccountService(credential);

  const templatesPath = path.join(
    import.meta.dirname,
    "../../../templates/environment",
  );

  createDeploymentEnvironmentGenerator(
    plop,
    templatesPath,
    cloudAccountRepository,
    cloudAccountService,
    github,
  );
};
