import type { TokenCredential } from "@azure/identity";

/**
 * Moves the Terraform state of infra/repository to the Azure backend before
 * the repository environments are synchronized.
 */
import { getLogger } from "@logtape/logtape";
import { type NodePlopAPI } from "node-plop";
import path from "node:path";

import { makeDestinationHasState } from "../../azure/repository-state-storage.js";
import { tf$ } from "../../execa/terraform.js";
import {
  ensureRemoteRepositoryState,
  type RepositoryStateDestination,
} from "../../terraform/repository-state.js";
import { payloadSchema } from "../generators/environment/prompts.js";
import { terraformStateKey } from "../helpers/terraform-state-key.js";

export default function (plop: NodePlopAPI, credential: TokenCredential): void {
  plop.setActionType("prepareRepositoryState", async (data) => {
    const logger = getLogger(["gen", "env"]);
    const payload = payloadSchema.parse(data);
    const backend = payload.terraform?.backend;
    if (!backend) {
      throw new Error("Terraform backend is not available");
    }
    const destination: RepositoryStateDestination = {
      containerName: "terraform-state",
      key: terraformStateKey(payload, "repository"),
      resourceGroupName: backend.resourceGroupName,
      storageAccountName: backend.storageAccountName,
      subscriptionId: backend.subscriptionId,
    };
    logger.info(
      "Repository Terraform state destination: {account}/{container}/{key}",
      {
        account: destination.storageAccountName,
        container: destination.containerName,
        key: destination.key,
      },
    );
    const repositoryPath = path.join(process.cwd(), "infra", "repository");
    const terraform = tf$({ cwd: repositoryPath, reject: false });
    const status = await ensureRemoteRepositoryState({
      destination,
      destinationHasState: makeDestinationHasState(credential),
      repositoryName: payload.github.repo,
      repositoryPath,
      terraform: async (args) => {
        const { exitCode, stdout } = await terraform`terraform ${args}`;
        return { exitCode: exitCode ?? 1, stdout: String(stdout) };
      },
    });
    data.repositoryState = { destination, status };
    return `Repository state: ${status}`;
  });
}
