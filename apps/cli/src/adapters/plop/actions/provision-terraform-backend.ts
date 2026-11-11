import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import { configureTerraformBackendAccess } from "../../terraform/configure-backends.js";
import { readTerraformBackendConfiguration } from "../../terraform/hcl-terraform-backend.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

export const provisionTerraformBackend = async (
  payload: Payload,
  cloudAccountService: CloudAccountService,
) => {
  assert.ok(
    payload.init,
    "This action requires initialization data in the payload",
  );
  assert.ok(
    payload.init.terraformBackend,
    "This action requires terraformBackend data in the payload",
  );
  const [configuredBackend, configuredCoreBackend] = await Promise.all([
    readTerraformBackendConfiguration(
      process.cwd(),
      "bootstrapper",
      payload.env.name,
      payload.workspace.domain,
    ),
    readTerraformBackendConfiguration(
      process.cwd(),
      "core",
      payload.env.name,
      payload.workspace.domain,
    ),
  ]);
  const backend =
    configuredBackend?.backend ??
    (await cloudAccountService.provisionTerraformBackend(
      payload.init.terraformBackend.cloudAccount,
      payload.env,
      payload.workspace.domain,
      payload.tags,
    ));
  return configureTerraformBackendAccess(
    cloudAccountService,
    backend,
    payload.env,
    configuredBackend,
    configuredCoreBackend,
  );
};

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("provisionTerraformBackend", async (data) => {
    const payload = payloadSchema.parse(data);
    data.terraform ??= {};
    const setup = await provisionTerraformBackend(payload, cloudAccountService);
    data.terraform.backend = setup.backend;
    data.terraform.backendKey = setup.backendKey;
    data.terraform.backendConfigFiles = setup.backendConfigFiles;
    data.terraform.coreBackend = setup.coreBackend;
    return "Terraform Backend Provisioned";
  });
}
