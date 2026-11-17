/**
 * Resolves the repository's permanent backend without changing other state keys.
 * Only literal Azure backend configurations are supported.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

import {
  type TerraformBackend,
  terraformBackendSchema,
} from "../../domain/remote-backend.js";

export const repositoryStateDestinationSchema =
  terraformBackendSchema.options[0].omit({ type: true }).extend({
    containerName: z.string().min(1),
    key: z.string().min(1),
  });

export type RepositoryStateDestination = z.infer<
  typeof repositoryStateDestinationSchema
>;

const withoutComments = (content: string): string =>
  content.replace(
    /"(?:\\.|[^"\\])*"|#[^\n]*|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match) => (match.startsWith('"') ? match : ""),
  );

export const readRepositoryBackend = async (
  repositoryPath: string,
): Promise<RepositoryStateDestination | undefined> => {
  let providers: string;
  try {
    providers = withoutComments(
      await fs.readFile(path.join(repositoryPath, "providers.tf"), "utf8"),
    );
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return undefined;
    }
    throw new Error("Cannot read the repository backend configuration", {
      cause,
    });
  }
  const declarations = Array.from(
    providers.matchAll(/\bbackend\s+"([^"]+)"\s*\{/g),
  );
  if (declarations.length === 0) {
    return undefined;
  }
  const backend = /\bbackend\s+"azurerm"\s*\{([^{}]*)\}/.exec(providers);
  if (declarations.length !== 1 || !backend) {
    throw new Error(
      "infra/repository/providers.tf must contain one literal Azure backend",
    );
  }
  const values = Object.fromEntries(
    Array.from(
      backend[1].matchAll(/(\w+)\s*=\s*("(?:\\.|[^"\\])*"|true|false)/g),
      (match) => [match[1], JSON.parse(match[2])],
    ),
  );
  const result = repositoryStateDestinationSchema.safeParse({
    containerName: values.container_name,
    key: values.key,
    resourceGroupName: values.resource_group_name,
    storageAccountName: values.storage_account_name,
    subscriptionId: values.subscription_id,
  });
  if (!result.success) {
    throw new Error(
      "The repository backend must specify literal Azure destination values",
      {
        cause: result.error,
      },
    );
  }
  if (Object.values(result.data).some((value) => /\$\{|%\{/.test(value))) {
    throw new Error(
      "The repository backend cannot contain interpolated destination values",
    );
  }
  return result.data;
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
