import { DefaultAzureCredential } from "@azure/identity";
import { test as baseTest, describe, expect, vi } from "vitest";

import { AzureCloudAccountService } from "../cloud-account-service.js";

const { queryResources } = vi.hoisted(() => ({
  queryResources: vi.fn().mockRejectedValue(new Error("Not implemented")),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

vi.mock("@azure/arm-resourcegraph", () => ({
  ResourceGraphClient: class {
    resources = queryResources;
  },
}));

const test = baseTest.extend<{ cloudAccountService: AzureCloudAccountService }>(
  {
    // the empty pattern is required by vitest!!!
    // eslint-disable-next-line no-empty-pattern
    cloudAccountService: async ({}, use) => {
      const cloudAccountService = new AzureCloudAccountService(
        new DefaultAzureCredential(),
      );
      await use(cloudAccountService);
    },
  },
);

describe("getTerraformBackend", () => {
  test("returns undefined when no matching storage account is found", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValueOnce({
      data: [],
      totalRecords: 0,
    });
    const result = await cloudAccountService.getTerraformBackend("sub-1", {
      name: "dev",
      prefix: "dx",
    });
    expect(result).toBeUndefined();
  });

  test("return the only matching storage account", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValueOnce({
      data: [
        {
          location: "italynorth",
          name: "dxditntfstatest01",
          resourceGroup: "dx-d-itn-tfstate-rg-01",
          subscriptionId: "sub-1",
          type: "microsoft.storage/storageaccounts",
        },
      ],
      totalRecords: 1,
    });
    const result = await cloudAccountService.getTerraformBackend("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toEqual(
      expect.objectContaining({
        resourceGroupName: "dx-d-itn-tfstate-rg-01",
        storageAccountName: "dxditntfstatest01",
        type: "azurerm",
      }),
    );
  });

  test("returns the best matching storage account among multiple", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValueOnce({
      data: [
        {
          location: "italynorth",
          name: "dxditntfstatest01",
          resourceGroup: "dx-d-itn-tfstate-rg-01",
          subscriptionId: "sub-1",
          type: "microsoft.storage/storageaccounts",
        },
        {
          location: "italynorth",
          name: "dxditntfstatest02",
          resourceGroup: "dx-d-itn-tfstate-rg-01",
          subscriptionId: "sub-1",
          type: "microsoft.storage/storageaccounts",
        },
        {
          location: "westeurope",
          name: "dxdweutfstatest01",
          resourceGroup: "dx-d-weu-tfstate-rg-01",
          subscriptionId: "sub-1",
          type: "microsoft.storage/storageaccounts",
        },
      ],
      totalRecords: 3,
    });
    const result = await cloudAccountService.getTerraformBackend("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toEqual(
      expect.objectContaining({
        resourceGroupName: "dx-d-itn-tfstate-rg-01",
        storageAccountName: "dxditntfstatest02",
        type: "azurerm",
      }),
    );
  });
});
