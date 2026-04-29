import { DefaultAzureCredential } from "@azure/identity";
import { test as baseTest, beforeEach, describe, expect, vi } from "vitest";

import { AzureCloudAccountService } from "../cloud-account-service.js";

const { queryResources } = vi.hoisted(() => ({
  queryResources: vi.fn().mockRejectedValue(new Error("Not implemented")),
}));

const { mockProviderGet, mockProviderRegister } = vi.hoisted(() => ({
  mockProviderGet: vi
    .fn()
    .mockResolvedValue({ registrationState: "Registered" }),
  mockProviderRegister: vi.fn().mockResolvedValue({}),
}));

const { mockRoleAssignmentsCreate, mockRoleAssignmentsListForScope } =
  vi.hoisted(() => ({
    mockRoleAssignmentsCreate: vi.fn().mockResolvedValue({}),
    mockRoleAssignmentsListForScope: vi.fn(),
  }));

const {
  mockCreateFederatedIdentityCredential,
  mockCreateIdentity,
  mockCreateKeyVault,
  mockCreateResourceGroup,
  mockDeleteResourceGroup,
  mockGetSubscription,
  mockKeyVaultNameAvailability,
  mockSetSecret,
} = vi.hoisted(() => ({
  mockCreateFederatedIdentityCredential: vi.fn().mockResolvedValue({}),
  mockCreateIdentity: vi
    .fn()
    .mockResolvedValue({ clientId: "client-1", principalId: "principal-1" }),
  mockCreateKeyVault: vi.fn().mockResolvedValue({}),
  mockCreateResourceGroup: vi.fn().mockResolvedValue({}),
  mockDeleteResourceGroup: vi.fn().mockResolvedValue({}),
  mockGetSubscription: vi.fn().mockResolvedValue({ tenantId: "tenant-1" }),
  mockKeyVaultNameAvailability: vi.fn().mockResolvedValue({
    nameAvailable: true,
  }),
  mockSetSecret: vi.fn().mockResolvedValue({}),
}));

vi.mock("@azure/arm-authorization", () => ({
  AuthorizationManagementClient: class {
    roleAssignments = {
      create: mockRoleAssignmentsCreate,
      listForScope: mockRoleAssignmentsListForScope,
    };
  },
}));

vi.mock("@azure/arm-keyvault", () => ({
  KeyVaultManagementClient: class {
    vaults = {
      beginCreateOrUpdateAndWait: mockCreateKeyVault,
      checkNameAvailability: mockKeyVaultNameAvailability,
    };
  },
}));

vi.mock("@azure/arm-msi", () => ({
  ManagedServiceIdentityClient: class {
    federatedIdentityCredentials = {
      createOrUpdate: mockCreateFederatedIdentityCredential,
    };

    userAssignedIdentities = {
      createOrUpdate: mockCreateIdentity,
    };
  },
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

vi.mock("@azure/arm-resourcegraph", () => ({
  ResourceGraphClient: class {
    resources = queryResources;
  },
}));

vi.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: class {
    providers = {
      get: mockProviderGet,
      register: mockProviderRegister,
    };

    resourceGroups = {
      beginDeleteAndWait: mockDeleteResourceGroup,
      createOrUpdate: mockCreateResourceGroup,
    };
  },
}));

vi.mock("@azure/arm-resources-subscriptions", () => ({
  SubscriptionClient: class {
    subscriptions = {
      get: mockGetSubscription,
    };
  },
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    setSecret = mockSetSecret;
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

beforeEach(() => {
  queryResources.mockReset();
  queryResources.mockResolvedValue({ data: [], totalRecords: 0 });
  mockCreateFederatedIdentityCredential.mockClear();
  mockCreateIdentity.mockClear();
  mockCreateIdentity.mockResolvedValue({
    clientId: "client-1",
    principalId: "principal-1",
  });
  mockCreateKeyVault.mockClear();
  mockCreateResourceGroup.mockClear();
  mockDeleteResourceGroup.mockClear();
  mockGetSubscription.mockClear();
  mockGetSubscription.mockResolvedValue({ tenantId: "tenant-1" });
  mockKeyVaultNameAvailability.mockClear();
  mockKeyVaultNameAvailability.mockResolvedValue({ nameAvailable: true });
  mockProviderGet.mockClear();
  mockProviderGet.mockResolvedValue({ registrationState: "Registered" });
  mockProviderRegister.mockClear();
  mockRoleAssignmentsCreate.mockClear();
  mockRoleAssignmentsListForScope.mockReset();
  mockSetSecret.mockClear();
});

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

describe("isInitialized", () => {
  test("returns true when both bootstrap identity and common Key Vault exist and all providers are registered", async ({
    cloudAccountService,
  }) => {
    // First call: identity query → found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });
    // Second call: key vault query → found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });
    // Provider checks → all registered (default mock)

    const result = await cloudAccountService.isInitialized("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toBe(true);
  });

  test("returns false when bootstrap identity exists but common Key Vault does not", async ({
    cloudAccountService,
  }) => {
    // First call: identity query → found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });
    // Second call: key vault query → not found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 0 });

    const result = await cloudAccountService.isInitialized("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toBe(false);
  });

  test("returns false when common Key Vault exists but bootstrap identity does not", async ({
    cloudAccountService,
  }) => {
    // First call: identity query → not found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 0 });
    // Second call: key vault query → found
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });

    const result = await cloudAccountService.isInitialized("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toBe(false);
  });

  test("returns false when resources exist but a required provider is not registered", async ({
    cloudAccountService,
  }) => {
    // Both resources exist
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });
    queryResources.mockResolvedValueOnce({ data: [], totalRecords: 1 });
    // One provider is not registered
    mockProviderGet.mockResolvedValueOnce({
      registrationState: "NotRegistered",
    });

    const result = await cloudAccountService.isInitialized("sub-1", {
      name: "dev",
      prefix: "dx",
    });

    expect(result).toBe(false);
  });
});

describe("initialize", () => {
  test("assigns bootstrap roles to the bootstrap identity", async ({
    cloudAccountService,
  }) => {
    await cloudAccountService.initialize(
      {
        csp: "azure",
        defaultLocation: "italynorth",
        displayName: "Test subscription",
        id: "sub-1",
      },
      {
        name: "dev",
        prefix: "dx",
      },
      {
        id: "app-id",
        installationId: "installation-id",
        key: "private-key\n",
      },
      {
        owner: "pagopa",
        repo: "dx",
      },
      {
        createBranch: vi.fn(),
        createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
        createPullRequest: vi.fn(),
        getFileContent: vi.fn(),
        getRepository: vi.fn(),
        updateFile: vi.fn(),
      },
    );

    expect(mockRoleAssignmentsCreate).toHaveBeenCalledTimes(3);
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/f58310d9-a9f6-439a-9e8d-f62e7b41a168",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
      }),
    );
    expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledWith(
      "dx-d-itn-common-rg-01",
      "dx-d-itn-bootstrap-id-01",
      "bootstrapper-dev-cd",
      {
        audiences: ["api://AzureADTokenExchange"],
        issuer: "https://token.actions.githubusercontent.com",
        subject: "repo:pagopa/dx:environment:bootstrapper-dev-cd",
      },
    );
  });
});
