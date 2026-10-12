/**
 * Backend retries must never destroy a resource group containing shared states.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AzureCloudAccountService } from "../cloud-account-service.js";

const mocks = vi.hoisted(() => ({
  createContainer: vi.fn(),
  createGroup: vi.fn(),
  createStorage: vi.fn(),
  deleteGroup: vi.fn(),
  register: vi.fn(),
}));

vi.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: class {
    providers = { register: mocks.register };
    resourceGroups = {
      beginDeleteAndWait: mocks.deleteGroup,
      createOrUpdate: mocks.createGroup,
    };
  },
}));
vi.mock("@azure/arm-storage", () => ({
  StorageManagementClient: class {
    storageAccounts = { beginCreateAndWait: mocks.createStorage };
  },
}));
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class {
    getContainerClient() {
      return { createIfNotExists: mocks.createContainer };
    }
  },
}));

const service = new AzureCloudAccountService({ getToken: vi.fn() });
const account = {
  csp: "azure" as const,
  defaultLocation: "italynorth",
  displayName: "DEV-DX",
  id: "subscription-dev",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createStorage.mockResolvedValue({
    name: "dxditntfstatest01",
    primaryEndpoints: {
      blob: "https://dxditntfstatest01.blob.core.windows.net",
    },
  });
  mocks.createContainer.mockResolvedValue({ succeeded: true });
});

describe("Terraform backend provisioning", () => {
  it("registers Storage before provisioning without requiring GitHub environment initialization", async () => {
    const result = await service.provisionTerraformBackend(account, {
      name: "dev",
      prefix: "dx",
    });
    expect(mocks.register).toHaveBeenCalledWith("Microsoft.Storage");
    expect(mocks.register.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createGroup.mock.invocationCallOrder[0],
    );
    expect(result.storageAccountName).toBe("dxditntfstatest01");
  });

  it("reuses an existing state container on retry", async () => {
    mocks.createContainer.mockResolvedValue({ succeeded: false });
    await expect(
      service.provisionTerraformBackend(account, { name: "dev", prefix: "dx" }),
    ).resolves.toMatchObject({ storageAccountName: "dxditntfstatest01" });
    expect(mocks.deleteGroup).not.toHaveBeenCalled();
  });

  it("preserves the backend resource group when container access fails", async () => {
    mocks.createContainer.mockRejectedValue(
      new Error("Storage permission propagation"),
    );
    await expect(
      service.provisionTerraformBackend(account, { name: "dev", prefix: "dx" }),
    ).rejects.toThrow("creation of the blob container");
    expect(mocks.deleteGroup).not.toHaveBeenCalled();
  });
});
