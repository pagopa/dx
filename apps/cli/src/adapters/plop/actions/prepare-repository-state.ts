import type { TokenCredential } from "@azure/identity";

/**
 * Moves the Terraform state of infra/repository to the Azure backend before
 * the repository environments are synchronized.
 */
import { getLogger } from "@logtape/logtape";
import { type NodePlopAPI } from "node-plop";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { makeRepositoryStateStorage } from "../../azure/repository-state-storage.js";
import { tf$ } from "../../execa/terraform.js";
import {
  readRepositoryBackend,
  repositoryStateDestination,
  verifyInitializedRepositoryBackend,
} from "../../terraform/repository-backend.js";
import { ensureRemoteRepositoryState } from "../../terraform/repository-state.js";
import { payloadSchema } from "../generators/environment/prompts.js";

export default function (plop: NodePlopAPI, credential: TokenCredential): void {
  plop.setActionType("prepareRepositoryState", async (data) => {
    const logger = getLogger(["gen", "env"]);
    const payload = payloadSchema.parse(data);
    const backend = payload.terraform?.backend;
    if (!backend) {
      throw new Error("Terraform backend is not available");
    }
    const repositoryPath = path.join(process.cwd(), "infra", "repository");
    const destination =
      (await readRepositoryBackend(repositoryPath)) ??
      repositoryStateDestination(
        backend,
        payload.env.prefix,
        payload.workspace.domain,
      );
    if (!isDeepStrictEqual(payload.repositoryStateDestination, destination)) {
      throw new Error(
        "The repository state destination was not confirmed or changed since confirmation. Re-run the same `dx add environment` command.",
      );
    }
    logger.info(
      "Repository Terraform state destination: {account}/{container}/{key}",
      {
        account: destination.storageAccountName,
        container: destination.containerName,
        key: destination.key,
      },
    );
    const storage = makeRepositoryStateStorage(credential);
    const status = await storage.withLock(destination, async (cancelSignal) => {
      const terraform = tf$({
        cancelSignal,
        cwd: repositoryPath,
        reject: false,
      });
      return ensureRemoteRepositoryState({
        destination,
        destinationExists: storage.exists,
        environmentName: payload.env.name,
        repositoryId: payload.github.repoId,
        repositoryName: payload.github.repo,
        repositoryPath,
        terraform: async (args) => {
          cancelSignal.throwIfAborted();
          const { exitCode, stderr, stdout } =
            await terraform`terraform ${args}`;
          return {
            exitCode: exitCode ?? 1,
            stderr: String(stderr),
            stdout: String(stdout),
          };
        },
        verifyBackend: () =>
          verifyInitializedRepositoryBackend(repositoryPath, destination),
      });
    });
    data.repositoryState = { destination, status };
    return `Repository state: ${status}`;
  });
}
