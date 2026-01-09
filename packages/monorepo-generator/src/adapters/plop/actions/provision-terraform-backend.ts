import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import { CloudAccountService } from "../../../domain/cloud-account.js";
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
  const terraformBackend = await cloudAccountService.provisionTerraformBackend(
    payload.init.terraformBackend.cloudAccount,
    payload.env,
    payload.tags,
  );
  return terraformBackend;
};

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("provisionTerraformBackend", async (data) => {
    const payload = payloadSchema.parse(data);
    data.terraform ??= {};
    data.terraform.backend = await provisionTerraformBackend(
      payload,
      cloudAccountService,
    );
    return "Terraform Backend Provisioned";
  });
}
