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
import getPrompts, { Payload, payloadSchema } from "./prompts.js";

export const PLOP_ENVIRONMENT_GENERATOR_NAME = "DX_DeploymentEnvironment";
export { Payload, payloadSchema };

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

  plop.setGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: getPrompts({ cloudAccountRepository, cloudAccountService }),
  });
}
