/**
 * Verifies permanent destination resolution, including existing legacy keys.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  readRepositoryBackend,
  repositoryStateDestination,
  verifyInitializedRepositoryBackend,
} from "../repository-backend.js";

describe("repository backend", () => {
  let directory: string;
  const backend = {
    containerName: "domain-tf-state",
    resourceGroupName: "dev-rg",
    storageAccountName: "devstorage",
    subscriptionId: "dev-sub",
    type: "azurerm",
  } as const;
  const configured = `terraform {
    backend "azurerm" {
      resource_group_name = "dev-rg"
      storage_account_name = "devstorage"
      subscription_id = "dev-sub"
      container_name = "terraform-state"
      key = "domain/repository.tfstate"
      use_azuread_auth = true
    }
  }`;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "repository-backend-"));
  });
  afterEach(() => fs.rm(directory, { force: true, recursive: true }));

  it("uses the prescribed prefix/domain key only for new placement", () => {
    expect(repositoryStateDestination(backend, "dx", "domain").key).toBe(
      "dx/domain/repository.tfstate",
    );
  });

  it("reads and preserves an existing destination and legacy key", async () => {
    await fs.writeFile(path.join(directory, "backend.tf"), configured);

    await expect(readRepositoryBackend(directory)).resolves.toEqual({
      ...repositoryStateDestination(backend, "dx", "domain"),
      containerName: "terraform-state",
      key: "domain/repository.tfstate",
    });
  });

  it("ignores commented backend declarations", async () => {
    await fs.writeFile(
      path.join(directory, "providers.tf"),
      `/* ${configured} */\n# backend "local" {}`,
    );

    await expect(readRepositoryBackend(directory)).resolves.toBeUndefined();
  });

  it("rejects an initialized backend whose key differs from the confirmed one", async () => {
    const destination = repositoryStateDestination(backend, "dx", "domain");
    const terraformDirectory = path.join(directory, ".terraform");
    const config = {
      container_name: destination.containerName,
      key: destination.key,
      resource_group_name: destination.resourceGroupName,
      storage_account_name: destination.storageAccountName,
      subscription_id: destination.subscriptionId,
    };
    const metadata = (key: string) =>
      JSON.stringify({
        backend: { config: { ...config, key }, type: "azurerm" },
      });
    await fs.mkdir(terraformDirectory);
    const metadataPath = path.join(terraformDirectory, "terraform.tfstate");
    await fs.writeFile(metadataPath, metadata(destination.key));

    await expect(
      verifyInitializedRepositoryBackend(directory, destination),
    ).resolves.toBeUndefined();
    await fs.writeFile(metadataPath, metadata("other/repository.tfstate"));
    await expect(
      verifyInitializedRepositoryBackend(directory, destination),
    ).rejects.toThrow(/different Azure backend/);
  });

  it.each([
    'terraform { backend "local" {} }',
    configured.replace('subscription_id = "dev-sub"', ""),
    `${configured}\n${configured}`,
    configured.replace("devstorage", "${var.account}"),
  ])(
    "rejects unsupported or incomplete backend configuration",
    async (content) => {
      await fs.writeFile(path.join(directory, "providers.tf"), content);

      await expect(readRepositoryBackend(directory)).rejects.toThrow();
    },
  );
});
