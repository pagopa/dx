import { DefaultAzureCredential } from "@azure/identity";
import { type NodePlopAPI } from "node-plop";
import * as path from "node:path";
import { Octokit } from "octokit";

import { AzureSubscriptionRepository } from "../../../azure/cloud-account-repository.js";
import { AzureCloudAccountService } from "../../../azure/cloud-account-service.js";
import setFetchTerraformVersionsAction from "../../actions/fetch-terraform-versions.js";
import setGetGitHubRepoNameAction from "../../actions/get-github-repo-name.js";
import setGetTerraformBackend from "../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../actions/provision-terraform-backend.js";
import setAccountPrefixHelper from "../../helpers/account-prefix.js";
import setEnvShortHelper from "../../helpers/env-short.js";
import actions from "./actions.js";
import prompts from "./prompts.js";

export default function (plop: NodePlopAPI) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const credential = new DefaultAzureCredential();
  const azureSubscriptions = new AzureSubscriptionRepository(credential);
  const azureService = new AzureCloudAccountService(credential);
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../../../templates",
  );

  setAccountPrefixHelper(plop);
  setEnvShortHelper(plop);

  setGetTerraformBackend(plop, azureService);
  setGetGitHubRepoNameAction(plop);
  setFetchTerraformVersionsAction(plop, octokit);
  setProvisionTerraformBackendAction(plop, azureService);
  setInitCloudAccountsAction(plop, azureService);

  plop.setGenerator("DX_DeploymentEnvironment", {
    actions: actions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: prompts({
      cloudAccountRepository: azureSubscriptions,
      cloudAccountService: azureService,
    }),
  });
}
