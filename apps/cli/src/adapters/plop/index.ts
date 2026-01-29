import type { NodePlopAPI } from "plop";

import { DefaultAzureCredential } from "@azure/identity";
import { Result, ResultAsync } from "neverthrow";
import nodePlop, { PlopGenerator } from "node-plop";
import path from "node:path";
import { Octokit } from "octokit";

import { AzureSubscriptionRepository } from "../azure/cloud-account-repository.js";
import { AzureCloudAccountService } from "../azure/cloud-account-service.js";
import createDeploymentEnvironmentGenerator from "../plop/generators/environment/index.js";
import createMonorepoGenerator from "../plop/generators/monorepo/index.js";

export const initPlop = () =>
  ResultAsync.fromPromise(
    nodePlop(),
    () => new Error("Failed to initialize plop"),
  );

export const getGenerator = (plopAPI: NodePlopAPI) =>
  Result.fromThrowable(
    plopAPI.getGenerator,
    () => new Error("Generator not found"),
  );

export const getPrompts = (generator: PlopGenerator) =>
  ResultAsync.fromPromise(
    generator.runPrompts(),
    (cause) => new Error("Failed to run the generator prompts", { cause }),
  );

export const setMonorepoGenerator = (plop: NodePlopAPI) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../templates/monorepo",
  );
  createMonorepoGenerator(plop, templatesPath, octokit);
};

export const setDeploymentEnvironmentGenerator = (plop: NodePlopAPI) => {
  const credential = new DefaultAzureCredential();
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
  );
};
