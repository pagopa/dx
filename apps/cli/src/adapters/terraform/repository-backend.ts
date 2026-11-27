/**
 * Resolves the repository's permanent backend without changing other state keys.
 * Only literal Azure backend configurations are supported.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod/v4";

import {
  type TerraformBackend,
  terraformBackendSchema,
} from "../../domain/remote-backend.js";
import { readTerraformBackendFromRoot } from "./hcl-terraform-backend.js";

export const repositoryStateDestinationSchema =
  terraformBackendSchema.options[0].omit({ type: true }).extend({
    containerName: z.string().min(1),
    key: z.string().min(1),
  });

export type RepositoryStateDestination = z.infer<
  typeof repositoryStateDestinationSchema
>;

const initializedBackendSchema = z.object({
  backend: z.object({
    config: z.object({
      container_name: z.string(),
      key: z.string(),
      resource_group_name: z.string(),
      storage_account_name: z.string(),
      subscription_id: z.string(),
    }),
    type: z.literal("azurerm"),
  }),
});

export const verifyInitializedRepositoryBackend = async (
  repositoryPath: string,
  destination: RepositoryStateDestination,
): Promise<void> => {
  const metadata = await readFile(
    path.join(repositoryPath, ".terraform", "terraform.tfstate"),
    "utf8",
  );
  const parsed = initializedBackendSchema.safeParse(JSON.parse(metadata));
  if (
    !parsed.success ||
    !isDeepStrictEqual(parsed.data.backend.config, {
      container_name: destination.containerName,
      key: destination.key,
      resource_group_name: destination.resourceGroupName,
      storage_account_name: destination.storageAccountName,
      subscription_id: destination.subscriptionId,
    })
  ) {
    throw new Error(
      "Terraform initialized a different Azure backend than the confirmed repository state destination.",
    );
  }
};

export const readRepositoryBackend = async (
  repositoryPath: string,
): Promise<RepositoryStateDestination | undefined> => {
  const configured = await readTerraformBackendFromRoot(
    repositoryPath,
    repositoryPath,
  );
  return configured
    ? repositoryStateDestinationSchema.parse({
        ...configured.backend,
        key: configured.key,
      })
    : undefined;
};

export const repositoryStateDestination = (
  backend: TerraformBackend,
  prefix: string,
  domain: string,
): RepositoryStateDestination => ({
  containerName: backend.containerName,
  key: `${prefix}/${domain}/repository.tfstate`,
  resourceGroupName: backend.resourceGroupName,
  storageAccountName: backend.storageAccountName,
  subscriptionId: backend.subscriptionId,
});
