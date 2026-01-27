import { getLogger } from "@logtape/logtape";
import { type NodePlopAPI } from "node-plop";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import { getTerraformBackend } from "../../../domain/environment.js";
import { payloadSchema } from "../generators/environment/prompts.js";

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("getTerraformBackend", async (data) => {
    const logger = getLogger(["gen", "env"]);
    if (data.terraform?.backend) {
      return "Terraform Backend Retrieved";
    }
    const payload = payloadSchema.parse(data);
    const backend = await getTerraformBackend(cloudAccountService, payload.env);
    logger.debug("Retrieved terraform backend {backend}", { backend });
    data.terraform ??= {};
    data.terraform.backend = backend;
    return "Terraform Backend Retrieved";
  });
}
