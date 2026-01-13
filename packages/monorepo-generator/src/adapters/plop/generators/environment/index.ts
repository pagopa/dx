import { type NodePlopAPI } from "node-plop";
import * as path from "node:path";

import {
  CloudAccountRepository,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import setGetGitHubRepoNameAction from "../../actions/get-github-repo-name.js";
import setGetTerraformBackend from "../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../actions/provision-terraform-backend.js";
import setAccountPrefixHelper from "../../helpers/account-prefix.js";
import setEnvShortHelper from "../../helpers/env-short.js";
import actions from "./actions.js";
import prompts from "./prompts.js";

export default function (
  plop: NodePlopAPI,
  cloudAccountRepository: CloudAccountRepository,
  cloudAccountService: CloudAccountService,
) {
  const templatesPath = path.join(
    import.meta.dirname,
    "../../../../../templates",
  );

  setAccountPrefixHelper(plop);
  setEnvShortHelper(plop);

  setGetTerraformBackend(plop, cloudAccountService);
  setGetGitHubRepoNameAction(plop);
  setProvisionTerraformBackendAction(plop, cloudAccountService);
  setInitCloudAccountsAction(plop, cloudAccountService);

  plop.setGenerator("DX_DeploymentEnvironment", {
    actions: actions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: prompts({ cloudAccountRepository, cloudAccountService }),
  });
}
