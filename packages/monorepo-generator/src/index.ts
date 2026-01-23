import type { NodePlopAPI } from "plop";

import { DefaultAzureCredential } from "@azure/identity";
import path from "node:path";
import { Octokit } from "octokit";

import { AzureSubscriptionRepository } from "./adapters/azure/cloud-account-repository.js";
import { AzureCloudAccountService } from "./adapters/azure/cloud-account-service.js";
import createDeploymentEnvironmentGenerator from "./adapters/plop/generators/environment/index.js";
import createMonorepoGenerator from "./adapters/plop/generators/monorepo/index.js";

export const setMonorepoGenerator = (plop: NodePlopAPI) => {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const templatesPath = path.join(import.meta.dirname, "../templates/monorepo");
  createMonorepoGenerator(plop, templatesPath, octokit);
};

export const setDeploymentEnvironmentGenerator = (plop: NodePlopAPI) => {
  const credential = new DefaultAzureCredential();
  const cloudAccountRepository = new AzureSubscriptionRepository(credential);
  const cloudAccountService = new AzureCloudAccountService(credential);

  const templatesPath = path.join(
    import.meta.dirname,
    "../templates/environment",
  );

  createDeploymentEnvironmentGenerator(
    plop,
    templatesPath,
    cloudAccountRepository,
    cloudAccountService,
  );
};
