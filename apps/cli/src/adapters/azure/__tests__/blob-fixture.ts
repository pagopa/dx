/**
 * SDK-shaped Azure boundary backed by test-scoped files and independent leases.
 */
import fs from "node:fs/promises";
import path from "node:path";

import type { RepositoryStateDestination } from "../../../domain/repository-state.js";

export const destination: RepositoryStateDestination = {
  backend: {
    resourceGroupName: "dx-d-itn-tfstate-rg-01",
    storageAccountName: "dxditntfstatest01",
    subscriptionId: "subscription-dev",
    type: "azurerm",
  },
  containerName: "terraform-state",
  key: "dx/payments/repository.tfstate",
};

export const credential = {
  getToken: async () => ({
    expiresOnTimestamp: 4_000_000_000_000,
    token: "test",
  }),
};

export const blobs = {
  leases: new Map<
    string,
    {
      duration: number;
      expiresAt: number;
      owner: symbol;
    }
  >(),
  root: "",
};

export const blobFaults: {
  container?: Error;
  release?: Error;
  renewal?: Error;
  renewalHangs?: boolean;
} = {};

const storageError = (code: string) => Object.assign(new Error(code), { code });

export class BlobServiceClient {
  constructor(private readonly url: string) {}

  getContainerClient(name: string) {
    if (!blobs.root) {
      throw new Error("Blob fixture has not been initialized.");
    }
    const directory = path.join(blobs.root, new URL(this.url).hostname, name);
    return {
      createIfNotExists: async () => {
        if (blobFaults.container) {
          throw blobFaults.container;
        }
        return fs.mkdir(directory, { recursive: true });
      },
      getBlobClient: (key: string) => ({
        downloadToBuffer: async () => {
          try {
            return await fs.readFile(path.join(directory, key));
          } catch (cause) {
            if (
              cause instanceof Error &&
              "code" in cause &&
              cause.code === "ENOENT"
            ) {
              throw storageError("BlobNotFound");
            }
            throw cause;
          }
        },
      }),
      getBlockBlobClient: (key: string) => {
        const filename = path.join(directory, key);
        const activeLease = () => {
          const lease = blobs.leases.get(filename);
          if (lease && lease.expiresAt <= Date.now()) {
            blobs.leases.delete(filename);
            return undefined;
          }
          return lease;
        };
        return {
          getBlobLeaseClient: () => {
            const owner = Symbol("lease");
            return {
              acquireLease: async (duration: number) => {
                if (duration !== -1 && (duration < 15 || duration > 60)) {
                  throw storageError("InvalidHeaderValue");
                }
                if (activeLease()) {
                  throw storageError("LeaseAlreadyPresent");
                }
                blobs.leases.set(filename, {
                  duration,
                  expiresAt:
                    duration === -1 ? Infinity : Date.now() + duration * 1000,
                  owner,
                });
              },
              releaseLease: async () => {
                if (blobFaults.release) {
                  throw blobFaults.release;
                }
                if (activeLease()?.owner !== owner) {
                  throw storageError("LeaseIdMismatchWithLeaseOperation");
                }
                blobs.leases.delete(filename);
              },
              renewLease: async (options?: { abortSignal?: AbortSignal }) => {
                if (blobFaults.renewalHangs) {
                  const signal = options?.abortSignal;
                  if (!signal) {
                    throw new Error(
                      "Hanging SDK requests need an abort signal.",
                    );
                  }
                  await new Promise<void>((_resolve, reject) => {
                    signal.addEventListener(
                      "abort",
                      () => reject(signal.reason),
                      { once: true },
                    );
                  });
                }
                if (blobFaults.renewal) {
                  throw blobFaults.renewal;
                }
                const lease = activeLease();
                if (lease?.owner !== owner) {
                  throw storageError("LeaseLost");
                }
                lease.expiresAt =
                  lease.duration === -1
                    ? Infinity
                    : Date.now() + lease.duration * 1000;
              },
            };
          },
          upload: async (
            content: string,
            length: number,
            options?: { conditions?: { ifNoneMatch?: string } },
          ) => {
            if (Buffer.byteLength(content) !== length) {
              throw storageError("InvalidHeaderValue");
            }
            await fs.mkdir(path.dirname(filename), { recursive: true });
            const conditional = options?.conditions?.ifNoneMatch === "*";
            if (!conditional && activeLease()) {
              throw storageError("LeaseIdMissing");
            }
            try {
              await fs.writeFile(filename, content, {
                flag: conditional ? "wx" : "w",
              });
            } catch (cause) {
              if (
                cause instanceof Error &&
                "code" in cause &&
                cause.code === "EEXIST"
              ) {
                throw storageError("ConditionNotMet");
              }
              throw cause;
            }
          },
        };
      },
    };
  }
}
