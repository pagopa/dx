/**
 * Backend availability through public provisioning, discovery, and storage APIs.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CloudAccount } from "../../../domain/cloud-account.js";
import type { EnvironmentId } from "../../../domain/environment.js";

import { arm } from "./arm-fixture.js";
import { blobFaults, blobs, credential, destination } from "./blob-fixture.js";

vi.mock("@azure/arm-resources", async () => {
  const { ResourceManagementClient } = await import("./arm-fixture.js");
  return { ResourceManagementClient };
});
vi.mock("@azure/arm-storage", async () => {
  const { StorageManagementClient } = await import("./arm-fixture.js");
  return { StorageManagementClient };
});
vi.mock("@azure/arm-resourcegraph", async () => {
  const { ResourceGraphClient } = await import("./arm-fixture.js");
  return { ResourceGraphClient };
});
vi.mock("@azure/storage-blob", async () => {
  const { BlobServiceClient } = await import("./blob-fixture.js");
  return { BlobServiceClient };
});

import { AzureCloudAccountService } from "../cloud-account-service.js";
import { AzureRepositoryStateStorage } from "../repository-state-storage.js";

const account: CloudAccount = {
  csp: "azure",
  defaultLocation: "italynorth",
  displayName: "DEV-DX",
  id: "subscription-dev",
};
const environment: EnvironmentId = { name: "dev", prefix: "dx" };
const service = new AzureCloudAccountService(credential);
const storage = new AzureRepositoryStateStorage(credential);

beforeEach(async () => {
  blobs.root = await fs.mkdtemp(path.join(os.tmpdir(), "dx-backend-contract-"));
  blobs.leases.clear();
  delete blobFaults.release;
  delete blobFaults.container;
  arm.groups.clear();
  arm.resources.clear();
  arm.registered.clear();
});

afterEach(async () => {
  await fs.rm(blobs.root, { recursive: true });
});

describe("Terraform backend provisioning", () => {
  it("provisions a usable backend when the subscription has not registered Storage yet", async () => {
    await expect(
      service.provisionTerraformBackend(account, environment),
    ).resolves.toEqual(destination.backend);

    await expect(
      service.getTerraformBackend(account.id, environment),
    ).resolves.toEqual(destination.backend);
    await expect(
      storage.withLock(destination, async () => "backend available"),
    ).resolves.toBe("backend available");
  });

  it("preserves shared state after a container permission failure and permits a safe retry", async () => {
    await service.provisionTerraformBackend(account, environment);
    const shared = { ...destination, key: "bootstrapper.tfstate" };
    const filename = path.join(
      blobs.root,
      "dxditntfstatest01.blob.core.windows.net",
      "terraform-state",
      shared.key,
    );
    await fs.writeFile(filename, "existing bootstrapper state");
    blobFaults.container = new Error("Storage permissions have not propagated");

    await expect(
      service.provisionTerraformBackend(account, environment),
    ).rejects.toThrow("Error during the creation of the blob container");
    await expect(storage.read(shared)).resolves.toBe(
      "existing bootstrapper state",
    );

    delete blobFaults.container;
    await expect(
      service.provisionTerraformBackend(account, environment),
    ).resolves.toEqual(destination.backend);
    await expect(storage.read(shared)).resolves.toBe(
      "existing bootstrapper state",
    );
  });
});
