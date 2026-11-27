/**
 * Checks blob existence and serializes CLI migrations independently of Terraform's lease.
 */
import type { TokenCredential } from "@azure/identity";

import { BlobServiceClient } from "@azure/storage-blob";
import { setTimeout as sleep } from "node:timers/promises";

import type { RepositoryStateDestination } from "../terraform/repository-backend.js";

const hasCode = (cause: unknown, ...codes: string[]): boolean =>
  cause instanceof Error &&
  "code" in cause &&
  typeof cause.code === "string" &&
  codes.includes(cause.code);

export const makeRepositoryStateStorage = (credential: TokenCredential) => {
  const container = (destination: RepositoryStateDestination) =>
    new BlobServiceClient(
      `https://${destination.storageAccountName}.blob.core.windows.net`,
      credential,
    ).getContainerClient(destination.containerName);

  return {
    async exists(destination: RepositoryStateDestination): Promise<boolean> {
      try {
        return await container(destination)
          .getBlobClient(destination.key)
          .exists();
      } catch (cause) {
        throw new Error("Cannot check the repository state destination blob", {
          cause,
        });
      }
    },
    async withLock<T>(
      destination: RepositoryStateDestination,
      task: (signal: AbortSignal) => Promise<T>,
    ): Promise<T> {
      const lock = container(destination).getBlockBlobClient(
        `${destination.key}.dx-migration-lock`,
      );
      try {
        await lock.upload("", 0, { conditions: { ifNoneMatch: "*" } });
      } catch (cause) {
        if (!hasCode(cause, "BlobAlreadyExists", "ConditionNotMet")) {
          throw new Error(
            "Cannot prepare the repository state migration lock",
            { cause },
          );
        }
      }
      const lease = lock.getBlobLeaseClient();
      try {
        await lease.acquireLease(60);
      } catch (cause) {
        throw new Error(
          "Cannot acquire the repository state migration lock. Another migration may be running; re-run the same `dx add environment` command after it finishes.",
          { cause },
        );
      }
      const controller = new AbortController();
      const renewal = (async () => {
        while (!controller.signal.aborted) {
          try {
            await sleep(20_000, undefined, { signal: controller.signal });
            await lease.renewLease({
              abortSignal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(10_000),
              ]),
            });
          } catch (cause) {
            if (!controller.signal.aborted) {
              controller.abort(
                new Error(
                  "Repository state migration lock was lost; fix the problem and re-run the same `dx add environment` command.",
                  { cause },
                ),
              );
            }
          }
        }
      })();
      let outcome: PromiseSettledResult<T>;
      try {
        const result = await task(controller.signal);
        controller.signal.throwIfAborted();
        outcome = { status: "fulfilled", value: result };
      } catch (cause) {
        outcome = {
          reason: controller.signal.aborted ? controller.signal.reason : cause,
          status: "rejected",
        };
      }
      controller.abort();
      await renewal;
      try {
        await lease.releaseLease();
      } catch (cause) {
        const failure: unknown =
          outcome.status === "rejected" ? outcome.reason : undefined;
        throw new AggregateError(
          failure === undefined ? [cause] : [failure, cause],
          `${failure instanceof Error ? failure.message : "Repository state migration finished"}; cannot release the migration lease. Re-run the same \`dx add environment\` command after the lease expires.`,
          { cause },
        );
      }
      if (outcome.status === "rejected") {
        throw outcome.reason;
      }
      return outcome.value;
    },
  };
};
