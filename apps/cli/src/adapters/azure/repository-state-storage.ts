/**
 * Reads the Terraform state blob of the repository from the Azure backend.
 */
import type { TokenCredential } from "@azure/identity";

import { BlobServiceClient } from "@azure/storage-blob";
import { z } from "zod/v4";

import type { RepositoryStateDestination } from "../terraform/repository-state.js";

const stateSchema = z.object({
  resources: z.array(z.unknown()).default([]),
});

const isMissing = (cause: unknown): boolean =>
  cause instanceof Error &&
  "code" in cause &&
  (cause.code === "BlobNotFound" || cause.code === "ContainerNotFound");

/**
 * True when the blob holds a state with at least one managed resource. A
 * missing or empty blob (for example, left by a failed lock) has no state.
 */
export const makeDestinationHasState =
  (credential: TokenCredential) =>
  async (destination: RepositoryStateDestination): Promise<boolean> => {
    const client = new BlobServiceClient(
      `https://${destination.storageAccountName}.blob.core.windows.net`,
      credential,
    );
    let content: string;
    try {
      content = (
        await client
          .getContainerClient(destination.containerName)
          .getBlobClient(destination.key)
          .downloadToBuffer()
      ).toString("utf8");
    } catch (cause) {
      if (isMissing(cause)) {
        return false;
      }
      throw new Error("Cannot read the remote repository state", { cause });
    }
    if (!content.trim()) {
      return false;
    }
    try {
      return stateSchema.parse(JSON.parse(content)).resources.length > 0;
    } catch (cause) {
      throw new Error("The remote repository state is not valid", { cause });
    }
  };
