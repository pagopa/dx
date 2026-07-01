import { type NodePlopAPI } from "node-plop";

import {
  CloudAccountRepository,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import { GitHubRepo } from "../../../../domain/github-repo.js";
import { type GitHubService } from "../../../../domain/github.js";
import setGetTerraformBackend from "../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../actions/provision-terraform-backend.js";
import setSyncRepositoryEnvironmentsAction from "../../actions/sync-repository-environments.js";
import setEnvShortHelper from "../../helpers/env-short.js";
import setEqHelper from "../../helpers/eq.js";
import setResourcePrefixHelper from "../../helpers/resource-prefix.js";
import setTerraformStateKeyHelper from "../../helpers/terraform-state-key.js";
import getActions from "./actions.js";
import getPrompts, {
  InitialAnswers,
  Payload,
  payloadSchema,
} from "./prompts.js";

export const PLOP_ENVIRONMENT_GENERATOR_NAME = "DX_DeploymentEnvironment";
export { type InitialAnswers, Payload, payloadSchema };

export default function (
  plop: NodePlopAPI,
  templatesPath: string,
  cloudAccountRepository: CloudAccountRepository,
  cloudAccountService: CloudAccountService,
  gitHubService: GitHubService,
  github?: GitHubRepo,
  initialAnswers: InitialAnswers = {},
) {
  setEnvShortHelper(plop);
  setResourcePrefixHelper(plop);
  setEqHelper(plop);
  setTerraformStateKeyHelper(plop);

  setGetTerraformBackend(plop, cloudAccountService);
  setProvisionTerraformBackendAction(plop, cloudAccountService);
  setInitCloudAccountsAction(plop, cloudAccountService, gitHubService);
  setSyncRepositoryEnvironmentsAction(plop);

  plop.setGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: getPrompts({
      cloudAccountRepository,
      cloudAccountService,
      github,
      initialAnswers,
    }),
  });
}
