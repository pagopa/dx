import { type NodePlopAPI } from "node-plop";

import {
  CloudAccountRepository,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import setGetTerraformBackend from "../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../actions/provision-terraform-backend.js";
import setEnvShortHelper from "../../helpers/env-short.js";
import setResourcePrefixHelper from "../../helpers/resource-prefix.js";
import getActions from "./actions.js";
import getPrompts from "./prompts.js";

export default function (
  plop: NodePlopAPI,
  templatesPath: string,
  cloudAccountRepository: CloudAccountRepository,
  cloudAccountService: CloudAccountService,
) {
  setEnvShortHelper(plop);
  setResourcePrefixHelper(plop);

  setGetTerraformBackend(plop, cloudAccountService);
  setProvisionTerraformBackendAction(plop, cloudAccountService);
  setInitCloudAccountsAction(plop, cloudAccountService);

  plop.setGenerator("DX_DeploymentEnvironment", {
    actions: getActions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: getPrompts({ cloudAccountRepository, cloudAccountService }),
  });
}
