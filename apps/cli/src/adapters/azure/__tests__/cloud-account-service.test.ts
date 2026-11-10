import type { Mock } from "vitest";

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
  mockBlobContainerCreate,
  mockBlobContainerGet,
  mockBlobContainerGetProperties,
  mockStorageAccountCreate,
  mockStorageAccountGetProperties,
} = vi.hoisted(() => ({
  mockBlobContainerCreate: vi.fn().mockResolvedValue({}),
  mockBlobContainerGet: vi.fn().mockResolvedValue({}),
  mockBlobContainerGetProperties: vi.fn().mockResolvedValue({}),
  mockStorageAccountCreate: vi.fn().mockResolvedValue({
    name: "dxditntfstatest01",
  }),
  mockStorageAccountGetProperties: vi.fn().mockResolvedValue({
    primaryEndpoints: {
      blob: "https://dxditntfstatest01.blob.core.windows.net/",
    },
  }),
}));

const {
  mockBlobAcquireLease,
  mockBlobDelete,
  mockBlobGetProperties,
  mockBlobReleaseLease,
  mockBlobUploadData,
} = vi.hoisted(() => ({
  mockBlobAcquireLease: vi.fn().mockResolvedValue({}),
  mockBlobDelete: vi.fn().mockResolvedValue({ succeeded: true }),
  mockBlobGetProperties: vi.fn().mockResolvedValue({}),
  mockBlobReleaseLease: vi.fn().mockResolvedValue({}),
  mockBlobUploadData: vi.fn().mockResolvedValue({}),
}));

const {
  mockCreateFederatedIdentityCredential,
  mockCreateIdentity,
  mockCreateKeyVault,
  mockCreateResourceGroup,
  mockDeleteResourceGroup,
  mockGetIdentity,
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
  mockGetIdentity: vi.fn().mockResolvedValue({ clientId: "client-1" }),
  mockGetSubscription: vi.fn().mockResolvedValue({ tenantId: "tenant-1" }),
  mockKeyVaultNameAvailability: vi.fn().mockResolvedValue({
    nameAvailable: true,
  }),
  mockSetSecret: vi.fn().mockResolvedValue({}),
}));
const { mockLookup } = vi.hoisted(() => ({
  mockLookup: vi.fn().mockResolvedValue([{ address: "127.0.0.1", family: 4 }]),
}));
const { mockSleep } = vi.hoisted(() => ({
  mockSleep: vi.fn().mockResolvedValue(undefined),
}));

const roleAssignments = (assignments: object[]) => ({
  [Symbol.asyncIterator]: async function* () {
    yield* assignments;
  },
});

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
      get: mockGetIdentity,
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

vi.mock("@azure/arm-storage", () => ({
  StorageManagementClient: class {
    blobContainers = {
      create: mockBlobContainerCreate,
      get: mockBlobContainerGet,
    };

    storageAccounts = {
      beginCreateAndWait: mockStorageAccountCreate,
      getProperties: mockStorageAccountGetProperties,
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

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class {
    getContainerClient = vi.fn(() => ({
      getBlockBlobClient: vi.fn(() => ({
        deleteIfExists: mockBlobDelete,
        getBlobLeaseClient: vi.fn(() => ({
          acquireLease: mockBlobAcquireLease,
          releaseLease: mockBlobReleaseLease,
        })),
        getProperties: mockBlobGetProperties,
        uploadData: mockBlobUploadData,
      })),
      getProperties: mockBlobContainerGetProperties,
    }));
  },
}));

vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: vi.fn(() => ({
      api: (path: string) => ({
        get: async () => (path === "/me" ? { id: "user-1" } : { value: [] }),
      }),
    })),
  },
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    setSecret = mockSetSecret;
  },
}));
vi.mock("node:dns/promises", () => ({
  lookup: mockLookup,
}));
vi.mock("node:timers/promises", () => ({
  setTimeout: mockSleep,
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
  mockGetIdentity.mockClear();
  mockGetIdentity.mockResolvedValue({ clientId: "client-1" });
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
  mockBlobContainerCreate.mockReset();
  mockBlobContainerCreate.mockResolvedValue({});
  mockBlobContainerGet.mockReset();
  mockBlobContainerGet.mockRejectedValue(
    Object.assign(new Error("Not found"), { statusCode: 404 }),
  );
  mockBlobContainerGetProperties.mockReset();
  mockBlobContainerGetProperties.mockResolvedValue({});
  mockStorageAccountCreate.mockReset();
  mockStorageAccountCreate.mockResolvedValue({ name: "dxditntfstatest01" });
  mockStorageAccountGetProperties.mockReset();
  mockStorageAccountGetProperties.mockResolvedValue({
    primaryEndpoints: {
      blob: "https://dxditntfstatest01.blob.core.windows.net/",
    },
  });
  mockBlobAcquireLease.mockReset();
  mockBlobAcquireLease.mockResolvedValue({});
  mockBlobDelete.mockReset();
  mockBlobDelete.mockResolvedValue({ succeeded: true });
  mockBlobGetProperties.mockReset();
  mockBlobGetProperties.mockResolvedValue({});
  mockBlobReleaseLease.mockReset();
  mockBlobReleaseLease.mockResolvedValue({});
  mockBlobUploadData.mockReset();
  mockBlobUploadData.mockResolvedValue({});
  mockSetSecret.mockClear();
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  mockSleep.mockClear();
});

const expectBootstrapperFederatedCredentials = (
  repo: string,
  owner = "pagopa",
) => {
  [
    { identityName: "dx-d-itn-bootstrap-id-01", stage: "cd" },
    { identityName: "dx-d-itn-bootstrap-ci-id-01", stage: "ci" },
  ].forEach(({ identityName, stage }) => {
    const environmentName = `bootstrapper-dev-${stage}`;

    expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledWith(
      "dx-d-itn-common-rg-01",
      identityName,
      `${repo}-${environmentName}`,
      {
        audiences: ["api://AzureADTokenExchange"],
        issuer: "https://token.actions.githubusercontent.com",
        subject: `repo:${owner}/${repo}:environment:${environmentName}`,
      },
    );
  });
};

const expectImmutableBootstrapperFederatedCredentials = (
  repo: string,
  ownerId: number,
  repoId: number,
  owner = "pagopa",
) => {
  [
    { identityName: "dx-d-itn-bootstrap-id-01", stage: "cd" },
    { identityName: "dx-d-itn-bootstrap-ci-id-01", stage: "ci" },
  ].forEach(({ identityName, stage }) => {
    const environmentName = `bootstrapper-dev-${stage}`;

    expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledWith(
      "dx-d-itn-common-rg-01",
      identityName,
      `${repo}-${environmentName}-immutable`,
      {
        audiences: ["api://AzureADTokenExchange"],
        issuer: "https://token.actions.githubusercontent.com",
        subject: `repo:${owner}@${ownerId}/${repo}@${repoId}:environment:${environmentName}`,
      },
    );
  });
};

const expectBootstrapperEnvironmentSecrets = (
  createOrUpdateEnvironmentSecret: Mock,
  {
    cdClientId = "client-1",
    ciClientId = "client-1",
    includesRunnerSecrets = true,
    owner = "pagopa",
  }: {
    cdClientId?: string;
    ciClientId?: string;
    includesRunnerSecrets?: boolean;
    owner?: string;
  } = {},
) => {
  const expectedSecrets = [
    ["bootstrapper-dev-cd", "ARM_CLIENT_ID", cdClientId],
    ["bootstrapper-dev-cd", "ARM_TENANT_ID", "tenant-1"],
    ["bootstrapper-dev-cd", "ARM_SUBSCRIPTION_ID", "sub-1"],
    ...(includesRunnerSecrets
      ? [
          ["bootstrapper-dev-cd", "GH_APP_CLIENT_ID", "app-client-id"],
          ["bootstrapper-dev-cd", "GH_APP_INSTALLATION_ID", "installation-id"],
          ["bootstrapper-dev-cd", "GH_APP_KEY", "private-key"],
        ]
      : []),
    ["bootstrapper-dev-ci", "ARM_CLIENT_ID", ciClientId],
    ["bootstrapper-dev-ci", "ARM_TENANT_ID", "tenant-1"],
    ["bootstrapper-dev-ci", "ARM_SUBSCRIPTION_ID", "sub-1"],
  ];

  expect(createOrUpdateEnvironmentSecret).toHaveBeenCalledTimes(
    expectedSecrets.length,
  );
  expectedSecrets.forEach(([environmentName, secretName, secretValue]) => {
    expect(createOrUpdateEnvironmentSecret).toHaveBeenCalledWith({
      environmentName,
      owner,
      repo: "dx",
      secretName,
      secretValue,
    });
  });
};

describe("getTerraformBackend", () => {
  const accounts = {
    dev: {
      location: "italynorth",
      name: "dxditntfstatest01",
      resourceGroup: "dx-d-itn-tfstate-rg-01",
      subscriptionId: "sub-1",
      type: "microsoft.storage/storageaccounts",
    },
    latest: {
      location: "italynorth",
      name: "dxditntfstatest02",
      resourceGroup: "dx-d-itn-tfstate-rg-01",
      subscriptionId: "sub-1",
      type: "microsoft.storage/storageaccounts",
    },
    otherRegion: {
      location: "westeurope",
      name: "dxdweutfstatest01",
      resourceGroup: "dx-d-weu-tfstate-rg-01",
      subscriptionId: "sub-1",
      type: "microsoft.storage/storageaccounts",
    },
  };

  test.each([
    {
      data: [],
      expected: undefined,
      label: "returns undefined when no account matches",
    },
    {
      data: [accounts.dev],
      expected: expect.objectContaining({
        resourceGroupName: "dx-d-itn-tfstate-rg-01",
        storageAccountName: "dxditntfstatest01",
        type: "azurerm",
      }),
      label: "returns the only matching account",
    },
    {
      data: [accounts.dev, accounts.latest, accounts.otherRegion],
      expected: expect.objectContaining({
        resourceGroupName: "dx-d-itn-tfstate-rg-01",
        storageAccountName: "dxditntfstatest02",
        type: "azurerm",
      }),
      label: "selects the latest matching account in the expected region",
    },
  ])("$label", async ({ data, expected }) => {
    queryResources.mockResolvedValueOnce({
      data,
      totalRecords: data.length,
    });

    await expect(
      new AzureCloudAccountService(
        new DefaultAzureCredential(),
      ).getTerraformBackend("sub-1", { name: "dev", prefix: "dx" }, "payments"),
    ).resolves.toEqual(expected);
  });
});

describe("hasUserPermissionToInitialize", () => {
  test("does not require subscription-scoped Blob Data Contributor", async ({
    cloudAccountService,
  }) => {
    mockRoleAssignmentsListForScope.mockImplementation(() =>
      roleAssignments([
        {
          principalId: "user-1",
          roleDefinitionId:
            "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
        },
        {
          principalId: "user-1",
          roleDefinitionId:
            "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/b86a8fe4-44ce-4948-aee5-eccb2c155cd7",
        },
      ]),
    );

    await expect(
      cloudAccountService.hasUserPermissionToInitialize("sub-1"),
    ).resolves.toBe(true);
  });
});

describe("provisionTerraformBackend", () => {
  const account = {
    csp: "azure" as const,
    defaultLocation: "italynorth",
    displayName: "DEV-DX",
    id: "sub-1",
  };
  const environment = { name: "dev" as const, prefix: "dx" };

  test("reuses a discovered storage account without modifying it", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValue({
      data: [
        {
          location: "italynorth",
          name: "dxditntfstatest02",
          resourceGroup: "dx-d-itn-tfstate-rg-01",
        },
      ],
      totalRecords: 1,
    });

    const result = await cloudAccountService.provisionTerraformBackend(
      account,
      environment,
      "payments",
    );

    expect(result).toEqual(
      expect.objectContaining({
        containerName: "payments-tf-state",
        resourceGroupName: "dx-d-itn-tfstate-rg-01",
        storageAccountName: "dxditntfstatest02",
      }),
    );
    expect(mockCreateResourceGroup).not.toHaveBeenCalled();
    expect(mockStorageAccountCreate).not.toHaveBeenCalled();
  });

  test("keeps a partially provisioned resource group when account creation fails", async ({
    cloudAccountService,
  }) => {
    mockStorageAccountCreate.mockRejectedValue(
      new Error("Provisioning failed"),
    );

    await expect(
      cloudAccountService.provisionTerraformBackend(
        account,
        environment,
        "payments",
      ),
    ).rejects.toThrow("Provisioning failed");

    expect(mockCreateResourceGroup).toHaveBeenCalledWith(
      "dx-d-itn-tfstate-rg-01",
      expect.objectContaining({ location: "italynorth" }),
    );
    expect(mockDeleteResourceGroup).not.toHaveBeenCalled();
  });
});

describe("ensureTerraformBackendAccess", () => {
  const backend = {
    containerName: "payments-tf-state",
    resourceGroupName: "dx-d-itn-tfstate-rg-01",
    storageAccountName: "dxditntfstatest01",
    subscriptionId: "sub-1",
    type: "azurerm" as const,
  };

  test("creates containers through ARM and grants the user at each container scope", async ({
    cloudAccountService,
  }) => {
    mockRoleAssignmentsListForScope.mockImplementation(() =>
      roleAssignments([]),
    );

    await cloudAccountService.ensureTerraformBackendAccess(backend, [
      { ...backend, containerName: "dx-tf-state" },
    ]);

    expect(mockBlobContainerCreate).toHaveBeenCalledTimes(2);
    expect(mockBlobContainerCreate).toHaveBeenCalledWith(
      backend.resourceGroupName,
      backend.storageAccountName,
      "payments-tf-state",
      { publicAccess: "None" },
    );
    expect(mockBlobContainerCreate).toHaveBeenCalledWith(
      backend.resourceGroupName,
      backend.storageAccountName,
      "dx-tf-state",
      { publicAccess: "None" },
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledTimes(2);
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      expect.stringMatching(/\/containers\/payments-tf-state$/u),
      expect.any(String),
      expect.objectContaining({
        principalId: "user-1",
        principalType: "User",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      expect.stringMatching(/\/containers\/dx-tf-state$/u),
      expect.any(String),
      expect.objectContaining({ principalId: "user-1" }),
    );
    expect(mockBlobUploadData).toHaveBeenCalledTimes(2);
    expect(mockBlobAcquireLease).toHaveBeenCalledTimes(2);
    expect(mockBlobReleaseLease).toHaveBeenCalledTimes(2);
    expect(mockBlobDelete).toHaveBeenCalledTimes(2);
    expect(mockSleep).not.toHaveBeenCalled();
  });

  test("reuses existing containers and grants with non-deterministic names", async ({
    cloudAccountService,
  }) => {
    mockBlobContainerGet.mockResolvedValue({});
    mockRoleAssignmentsListForScope.mockImplementation(() =>
      roleAssignments([
        {
          principalId: "user-1",
          roleDefinitionId:
            "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
        },
      ]),
    );

    await cloudAccountService.ensureTerraformBackendAccess(backend, [
      { ...backend, containerName: "dx-tf-state" },
    ]);

    expect(mockBlobContainerCreate).not.toHaveBeenCalled();
    expect(mockRoleAssignmentsCreate).not.toHaveBeenCalled();
    expect(mockBlobUploadData).toHaveBeenCalledTimes(2);
  });

  test("waits for role propagation and reports a 403 after the bounded retry", async ({
    cloudAccountService,
  }) => {
    mockRoleAssignmentsListForScope.mockImplementation(() =>
      roleAssignments([]),
    );
    mockBlobUploadData.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { statusCode: 403 }),
    );

    await expect(
      cloudAccountService.ensureTerraformBackendAccess(backend),
    ).rejects.toThrow(
      'The current user cannot write and lock state in "payments-tf-state" after waiting for Azure role assignment propagation.',
    );

    expect(mockBlobUploadData).toHaveBeenCalledTimes(6);
    expect(mockSleep).toHaveBeenCalledTimes(5);
    expect(mockBlobAcquireLease).not.toHaveBeenCalled();
  });

  test("retries a lease 403 without creating another probe blob", async ({
    cloudAccountService,
  }) => {
    mockRoleAssignmentsListForScope.mockImplementation(() =>
      roleAssignments([]),
    );
    mockBlobAcquireLease
      .mockRejectedValueOnce(
        Object.assign(new Error("Forbidden"), { statusCode: 403 }),
      )
      .mockResolvedValueOnce({});

    await expect(
      cloudAccountService.ensureTerraformBackendAccess(backend),
    ).resolves.toBeUndefined();

    expect(mockBlobUploadData).toHaveBeenCalledTimes(1);
    expect(mockBlobAcquireLease).toHaveBeenCalledTimes(2);
    expect(mockSleep).toHaveBeenCalledTimes(1);
    expect(mockBlobDelete).toHaveBeenCalledTimes(1);
  });

  test("surfaces container provisioning authorization failures without fallback", async ({
    cloudAccountService,
  }) => {
    mockBlobContainerCreate.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { statusCode: 403 }),
    );

    await expect(
      cloudAccountService.ensureTerraformBackendAccess(backend),
    ).rejects.toThrow(
      'Failed to create Terraform state container "payments-tf-state".',
    );

    expect(mockBlobUploadData).not.toHaveBeenCalled();
  });
});

describe("verifyTerraformBackendReadAccess", () => {
  const backend = {
    containerName: "terraform-state",
    resourceGroupName: "legacy-rg",
    storageAccountName: "legacyaccount",
    subscriptionId: "sub-1",
    type: "azurerm" as const,
  };

  test("checks the existing state container and tolerates a not-yet-created state snapshot", async ({
    cloudAccountService,
  }) => {
    mockBlobGetProperties.mockRejectedValue(
      Object.assign(new Error("Not found"), { statusCode: 404 }),
    );

    await expect(
      cloudAccountService.verifyTerraformBackendReadAccess(
        backend,
        "dx.core.uat.tfstate",
      ),
    ).resolves.toBeUndefined();

    expect(mockBlobContainerGetProperties).toHaveBeenCalledTimes(1);
    expect(mockBlobGetProperties).toHaveBeenCalledTimes(1);
    expect(mockBlobUploadData).not.toHaveBeenCalled();
    expect(mockBlobAcquireLease).not.toHaveBeenCalled();
    expect(mockBlobDelete).not.toHaveBeenCalled();
  });

  test("reports the exact upstream scope when read access is denied", async ({
    cloudAccountService,
  }) => {
    mockBlobContainerGetProperties.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { statusCode: 403 }),
    );

    await expect(
      cloudAccountService.verifyTerraformBackendReadAccess(
        backend,
        "dx.core.uat.tfstate",
      ),
    ).rejects.toThrow(
      'The current Azure identity cannot read Terraform state container "terraform-state" at "/subscriptions/sub-1/resourceGroups/legacy-rg/providers/Microsoft.Storage/storageAccounts/legacyaccount/blobServices/default/containers/terraform-state". Verify Storage Blob Data Reader access before the first plan.',
    );

    expect(mockBlobGetProperties).not.toHaveBeenCalled();
    expect(mockBlobUploadData).not.toHaveBeenCalled();
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

// eslint-disable-next-line max-lines-per-function
describe("initialize", () => {
  test("assigns bootstrap roles and creates bootstrap environment secrets", async ({
    cloudAccountService,
  }) => {
    const createOrUpdateEnvironmentSecret = vi
      .fn()
      .mockResolvedValue(undefined);
    mockCreateIdentity
      .mockResolvedValueOnce({
        clientId: "cd-client-1",
        principalId: "cd-principal-1",
      })
      .mockResolvedValueOnce({
        clientId: "ci-client-1",
        principalId: "ci-principal-1",
      });

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
        clientId: "app-client-id",
        id: "app-id",
        installationId: "installation-id",
        key: "private-key\n",
      },
      {
        owner: "example-org",
        repo: "dx",
      },
      {
        createBranch: vi.fn(),
        createOrUpdateEnvironmentSecret,
        createPullRequest: vi.fn(),
        getFileContent: vi.fn(),
        getRepository: vi.fn(),
        updateFile: vi.fn(),
      },
    );

    expect(mockCreateIdentity).toHaveBeenCalledWith(
      "dx-d-itn-common-rg-01",
      "dx-d-itn-bootstrap-id-01",
      expect.any(Object),
    );
    expect(mockCreateIdentity).toHaveBeenCalledWith(
      "dx-d-itn-common-rg-01",
      "dx-d-itn-bootstrap-ci-id-01",
      expect.any(Object),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledTimes(5);
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "cd-principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/f58310d9-a9f6-439a-9e8d-f62e7b41a168",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "cd-principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "cd-principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "ci-principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7",
      }),
    );
    expect(mockRoleAssignmentsCreate).toHaveBeenCalledWith(
      "/subscriptions/sub-1",
      expect.any(String),
      expect.objectContaining({
        principalId: "ci-principal-1",
        principalType: "ServicePrincipal",
        roleDefinitionId:
          "/subscriptions/sub-1/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe",
      }),
    );
    expectBootstrapperFederatedCredentials("dx", "example-org");
    expectBootstrapperEnvironmentSecrets(createOrUpdateEnvironmentSecret, {
      cdClientId: "cd-client-1",
      ciClientId: "ci-client-1",
      owner: "example-org",
    });
  });

  describe("configureGitHubEnvironment", () => {
    test("creates repository-specific federated credentials for existing bootstrap identities", async ({
      cloudAccountService,
    }) => {
      const createOrUpdateEnvironmentSecret = vi
        .fn()
        .mockResolvedValue(undefined);
      mockGetIdentity
        .mockResolvedValueOnce({ clientId: "cd-client-1" })
        .mockResolvedValueOnce({ clientId: "ci-client-1" });

      await cloudAccountService.configureGitHubEnvironment(
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
          owner: "pagopa",
          repo: "dx",
        },
        {
          createBranch: vi.fn(),
          createOrUpdateEnvironmentSecret,
          createPullRequest: vi.fn(),
          getFileContent: vi.fn(),
          getRepository: vi.fn(),
          updateFile: vi.fn(),
        },
        {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
        },
      );

      expect(mockCreateIdentity).not.toHaveBeenCalled();
      expect(mockGetIdentity).toHaveBeenCalledWith(
        "dx-d-itn-common-rg-01",
        "dx-d-itn-bootstrap-id-01",
      );
      expect(mockGetIdentity).toHaveBeenCalledWith(
        "dx-d-itn-common-rg-01",
        "dx-d-itn-bootstrap-ci-id-01",
      );
      expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledTimes(2);
      expectBootstrapperFederatedCredentials("dx");
      expectBootstrapperEnvironmentSecrets(createOrUpdateEnvironmentSecret, {
        cdClientId: "cd-client-1",
        ciClientId: "ci-client-1",
      });
    });

    test("creates immutable federated credentials when numeric GitHub IDs are provided", async ({
      cloudAccountService,
    }) => {
      mockGetIdentity
        .mockResolvedValueOnce({ clientId: "cd-client-1" })
        .mockResolvedValueOnce({ clientId: "ci-client-1" });

      await cloudAccountService.configureGitHubEnvironment(
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
          owner: "example-org",
          ownerId: 57742367,
          repo: "aiepdf-poc",
          repoId: 1373623344,
        },
        {
          createBranch: vi.fn(),
          createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
          createPullRequest: vi.fn(),
          getFileContent: vi.fn(),
          getRepository: vi.fn(),
          updateFile: vi.fn(),
        },
        {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
        },
      );

      // One name-based credential plus one immutable credential per identity.
      expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledTimes(4);
      expectBootstrapperFederatedCredentials("aiepdf-poc", "example-org");
      expectImmutableBootstrapperFederatedCredentials(
        "aiepdf-poc",
        57742367,
        1373623344,
        "example-org",
      );
    });
  });

  test("uses a repository-specific federated credential name", async ({
    cloudAccountService,
  }) => {
    const createOrUpdateEnvironmentSecret = vi
      .fn()
      .mockResolvedValue(undefined);

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
        clientId: "app-client-id",
        id: "app-id",
        installationId: "installation-id",
        key: "private-key\n",
      },
      {
        owner: "pagopa",
        repo: "dx-playground",
      },
      {
        createBranch: vi.fn(),
        createOrUpdateEnvironmentSecret,
        createPullRequest: vi.fn(),
        getFileContent: vi.fn(),
        getRepository: vi.fn(),
        updateFile: vi.fn(),
      },
    );

    expect(mockCreateFederatedIdentityCredential).toHaveBeenCalledTimes(2);
    expectBootstrapperFederatedCredentials("dx-playground");
  });

  test("waits for the key vault endpoint to become resolvable", async ({
    cloudAccountService,
  }) => {
    mockLookup
      .mockRejectedValueOnce(
        Object.assign(new Error("not found"), {
          code: "ENOTFOUND",
        }),
      )
      .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);

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
        clientId: "app-client-id",
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

    expect(mockLookup).toHaveBeenCalledWith(
      "dx-d-itn-common-kv-01.vault.azure.net",
    );
    expect(mockLookup).toHaveBeenCalledTimes(2);
    expect(mockSleep).toHaveBeenCalledWith(10_000);
    expect(mockSetSecret).toHaveBeenCalledTimes(3);
  });
});
