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
    await fs.writeFile(path.join(directory, "providers.tf"), configured);

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

  it.each([
    'terraform { backend "local" {} }',
    configured.replace('subscription_id = "dev-sub"', ""),
    `${configured}\n${configured}`,
    configured.replace("devstorage", "${var.account}"),
  ])(
    "rejects unsupported or incomplete backend configuration",
    async (content) => {
      await fs.writeFile(path.join(directory, "providers.tf"), content);

      await expect(readRepositoryBackend(directory)).rejects.toThrow(/backend/);
    },
  );
});
