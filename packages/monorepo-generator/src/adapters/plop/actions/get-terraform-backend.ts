import { type NodePlopAPI } from "node-plop";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import { getTerraformBackend } from "../../../domain/environment.js";
import { payloadSchema } from "../generators/environment/prompts.js";

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("getTerraformBackend", async (data) => {
    if (data.terraform?.backend) {
      return "Terraform Backend Retrieved";
    }
    const payload = payloadSchema.parse(data);
    const backend = await getTerraformBackend(cloudAccountService, payload.env);
    data.terraform ??= {};
    data.terraform.backend = backend;
    return "Terraform Backend Retrieved";
  });
}
