/**
 * Read and persist the repository's permanent, literal Azure backend configuration.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod/v4";

import {
  parseTerraformJson,
  type RepositoryStateDestination,
  repositoryStateDestinationSchema,
} from "../../domain/repository-state.js";
import { terraformLiteral } from "./literal.js";

const backendPattern = /\bbackend\s+"([^"]+)"\s*\{([^{}]*)\}/g;
export const localMigrationOverride =
  'terraform {\n  backend "local" {\n    path = "terraform.tfstate"\n  }\n}\n';
export const localMigrationOverrideName = "repository-state_override.tf";

export const readOptionalFile = async (
  filename: string,
): Promise<string | undefined> => {
  try {
    return await fs.readFile(filename, "utf8");
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return undefined;
    }
    throw new Error(`Cannot read ${filename}.`, { cause });
  }
};

const parseBackend = (body: string): RepositoryStateDestination => {
  const values = Object.fromEntries(
    Array.from(
      body.matchAll(/^\s*(\w+)\s*=\s*("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/gm),
      (match) => [match[1], JSON.parse(match[2])],
    ),
  );
  const result = repositoryStateDestinationSchema.safeParse({
    backend: {
      resourceGroupName: values.resource_group_name,
      storageAccountName: values.storage_account_name,
      subscriptionId: values.subscription_id,
      type: "azurerm",
    },
    containerName: values.container_name,
    key: values.key,
  });
  if (
    !result.success ||
    Object.values(values).some(
      (value) => typeof value === "string" && /\$\{|%\{/.test(value),
    )
  ) {
    throw new Error(
      "Repository backend must specify literal resource_group_name, storage_account_name, subscription_id, container_name and key values.",
    );
  }
  return result.data;
};

export const readRepositoryBackend = async (
  repositoryPath: string,
): Promise<RepositoryStateDestination | undefined> => {
  const filenames = await fs.readdir(repositoryPath);
  const backends = (
    await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".tf"))
        .map(async (filename) => {
          const content = await fs.readFile(
            path.join(repositoryPath, filename),
            "utf8",
          );
          if (
            filename === localMigrationOverrideName &&
            content === localMigrationOverride
          ) {
            return [];
          }
          const blocks = Array.from(content.matchAll(backendPattern));
          if (
            blocks.length !==
            Array.from(content.matchAll(/\bbackend\s+"[^"]+"\s*\{/g)).length
          ) {
            throw new Error(
              "Cannot safely read the repository backend configuration.",
            );
          }
          return blocks;
        }),
    )
  ).flat();
  if (backends.length > 1) {
    throw new Error("Multiple repository Terraform backends are configured.");
  }
  const backend = backends[0];
  if (filenames.some((filename) => filename.endsWith(".tf.json"))) {
    throw new Error(
      "Automatic repository backend migration requires .tf configuration rather than .tf.json.",
    );
  }
  if (!backend) {
    return undefined;
  }
  if (backend[1] !== "azurerm") {
    throw new Error(
      `Repository backend "${backend[1]}" is not supported for automatic migration.`,
    );
  }
  return parseBackend(backend[2]);
};

export const writeRepositoryBackend = async (
  repositoryPath: string,
  destination: RepositoryStateDestination,
): Promise<void> => {
  const filename = path.join(repositoryPath, "providers.tf");
  const content = await fs.readFile(filename, "utf8");
  const { backend, containerName, key } = destination;
  const block = [
    '  backend "azurerm" {',
    `    resource_group_name  = ${terraformLiteral(backend.resourceGroupName)}`,
    `    storage_account_name = ${terraformLiteral(backend.storageAccountName)}`,
    `    subscription_id      = ${terraformLiteral(backend.subscriptionId)}`,
    `    container_name       = ${terraformLiteral(containerName)}`,
    `    key                  = ${terraformLiteral(key)}`,
    "    use_azuread_auth     = true",
    "  }",
    "",
  ].join("\n");
  if (!/\bterraform\s*\{\s*\n/.test(content)) {
    throw new Error(
      "Cannot find the Terraform block in repository/providers.tf.",
    );
  }
  await fs.writeFile(
    filename,
    content.replace(/\bterraform\s*\{\s*\n/, `terraform {\n${block}`),
    "utf8",
  );
};

export const describeRepositoryDestination = (
  destination: RepositoryStateDestination,
): string =>
  [
    `Subscription: ${destination.backend.subscriptionId}`,
    `Resource Group: ${destination.backend.resourceGroupName}`,
    `Storage Account: ${destination.backend.storageAccountName}`,
    `Container: ${destination.containerName}`,
    `Key: ${destination.key}`,
  ].join("\n");

export const verifyInitializedRepositoryBackend = async (
  repositoryPath: string,
  destination: RepositoryStateDestination,
): Promise<void> => {
  const content = await readOptionalFile(
    path.join(repositoryPath, ".terraform", "terraform.tfstate"),
  );
  const metadataSchema = z.object({
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
  const metadata = metadataSchema.safeParse(
    content === undefined
      ? undefined
      : parseTerraformJson(content, "Terraform backend metadata"),
  );
  if (!metadata.success) {
    throw new Error(
      "Terraform has not initialized the expected Azure repository backend.",
    );
  }
  const config = metadata.data.backend.config;
  if (
    !isDeepStrictEqual(destination, {
      backend: {
        resourceGroupName: config.resource_group_name,
        storageAccountName: config.storage_account_name,
        subscriptionId: config.subscription_id,
        type: "azurerm",
      },
      containerName: config.container_name,
      key: config.key,
    })
  ) {
    throw new Error(
      "Terraform's active repository backend differs from the verified state destination.",
    );
  }
};
