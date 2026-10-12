/**
 * OAuth-authenticated state inspection and migration coordination on Azure Blob.
 */
import type { TokenCredential } from "@azure/identity";

import { type BlobLeaseClient, BlobServiceClient } from "@azure/storage-blob";
import { setTimeout as sleep } from "node:timers/promises";

import type {
  RepositoryStateDestination,
  RepositoryStateStorage,
} from "../../domain/repository-state.js";

const hasStorageCode = (cause: unknown, code: string): boolean =>
  cause instanceof Error && "code" in cause && cause.code === code;

const renewLeaseWithDeadline = async (
  lease: BlobLeaseClient,
  signal: AbortSignal,
): Promise<void> => {
  const deadline = new AbortController();
  const renewalSignal = AbortSignal.any([signal, deadline.signal]);
  try {
    await Promise.race([
      lease.renewLease({ abortSignal: renewalSignal }),
      (async () => {
        await sleep(10_000, undefined, { signal: renewalSignal });
        throw new Error("Repository migration lease renewal timed out.");
      })(),
    ]);
  } finally {
    deadline.abort();
  }
};

export class AzureRepositoryStateStorage implements RepositoryStateStorage {
  constructor(private readonly credential: TokenCredential) {}

  async read(
    destination: RepositoryStateDestination,
  ): Promise<string | undefined> {
    try {
      const content = await this.container(destination)
        .getBlobClient(destination.key)
        .downloadToBuffer();
      return content.toString("utf8");
    } catch (cause) {
      if (hasStorageCode(cause, "BlobNotFound")) {
        return undefined;
      }
      throw new Error("Cannot read the remote repository state blob.", {
        cause,
      });
    }
  }

  async withLock<T>(
    destination: RepositoryStateDestination,
    task: (signal?: AbortSignal) => Promise<T>,
  ): Promise<T> {
    // A separate lease serializes CLI migrations without blocking Terraform's
    // own state lease. A finite lease also permits recovery after process exit.
    const container = this.container(destination);
    try {
      // Provisioning can fail after the account exists but before its container
      // is created. Discovery then reuses that account on the next attempt.
      await container.createIfNotExists();
    } catch (cause) {
      throw new Error("Cannot prepare the repository state container.", {
        cause,
      });
    }
    const blob = container.getBlockBlobClient(
      `${destination.key}.dx-migration-lock`,
    );
    try {
      await blob.upload("", 0, { conditions: { ifNoneMatch: "*" } });
    } catch (cause) {
      if (
        !hasStorageCode(cause, "BlobAlreadyExists") &&
        !hasStorageCode(cause, "ConditionNotMet")
      ) {
        throw new Error("Cannot create the repository migration lock.", {
          cause,
        });
      }
    }
    const lease = blob.getBlobLeaseClient();
    try {
      await lease.acquireLease(60);
    } catch (cause) {
      throw new Error(
        "Cannot acquire the repository migration lock. Another migration may be running; retry after it finishes.",
        { cause },
      );
    }
    const abort = new AbortController();
    let renewalError: unknown;
    const renewal = (async () => {
      while (!abort.signal.aborted) {
        try {
          await sleep(20_000, undefined, { signal: abort.signal });
          await renewLeaseWithDeadline(lease, abort.signal);
        } catch (cause) {
          if (!abort.signal.aborted) {
            renewalError = cause;
            abort.abort(cause);
          }
          return;
        }
      }
    })();
    try {
      const result = await task(abort.signal);
      if (renewalError) {
        throw new Error("Repository migration lock renewal failed.", {
          cause: renewalError,
        });
      }
      return result;
    } catch (cause) {
      if (renewalError) {
        throw new AggregateError(
          [renewalError, cause],
          "Repository migration lock renewal failed.",
          { cause },
        );
      }
      throw cause;
    } finally {
      abort.abort();
      await renewal;
      await lease.releaseLease();
    }
  }

  private container(destination: RepositoryStateDestination) {
    return new BlobServiceClient(
      `https://${destination.backend.storageAccountName}.blob.core.windows.net`,
      this.credential,
      { retryOptions: { maxTries: 1, tryTimeoutInMs: 10_000 } },
    ).getContainerClient(destination.containerName);
  }
}
