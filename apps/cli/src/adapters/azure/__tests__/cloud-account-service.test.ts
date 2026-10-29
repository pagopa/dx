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
  mockCreateFederatedIdentityCredential,
  mockCreateIdentity,
  mockCreateKeyVault,
  mockCreateResourceGroup,
  mockDeleteResourceGroup,
  mockGetIdentity,
  mockGetSecret,
  mockGetSubscription,
  mockKeyVaultNameAvailability,
  mockSecretClientConstructor,
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
  mockGetSecret: vi.fn(),
  mockGetSubscription: vi.fn().mockResolvedValue({ tenantId: "tenant-1" }),
  mockKeyVaultNameAvailability: vi.fn().mockResolvedValue({
    nameAvailable: true,
  }),
  mockSecretClientConstructor: vi.fn(),
  mockSetSecret: vi.fn().mockResolvedValue({}),
}));
const { mockLookup } = vi.hoisted(() => ({
  mockLookup: vi.fn().mockResolvedValue([{ address: "127.0.0.1", family: 4 }]),
}));
const { mockSleep } = vi.hoisted(() => ({
  mockSleep: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@azure/arm-resources-subscriptions", () => ({
  SubscriptionClient: class {
    subscriptions = {
      get: mockGetSubscription,
    };
  },
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    getSecret = mockGetSecret;

    setSecret = mockSetSecret;
    constructor(url: string) {
      mockSecretClientConstructor(url);
    }
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
  mockGetSecret.mockReset();
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
  mockSecretClientConstructor.mockClear();
  mockSetSecret.mockReset();
  mockSetSecret.mockResolvedValue({});
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  mockSleep.mockClear();
});

describe("Runner App credentials in the common Key Vault", () => {
  const account = {
    csp: "azure" as const,
    defaultLocation: "italynorth",
    displayName: "DEV-Test",
    id: "sub-1",
  };
  const environment = { name: "dev" as const, prefix: "dx" };
  const secrets: Record<string, string> = {
    "github-runner-app-client-id": "client-id",
    "github-runner-app-id": "app-id",
    "github-runner-app-installation-id": "installation-id",
    "github-runner-app-key": "private-key",
  };

  beforeEach(() => {
    queryResources.mockResolvedValue({
      data: [{ name: "dx-d-itn-common-kv-01" }],
      totalRecords: 1,
    });
  });

  test("reads all credentials from the selected account's common vault", async ({
    cloudAccountService,
  }) => {
    mockGetSecret.mockImplementation(async (name: string) => ({
      value: secrets[name],
    }));

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).resolves.toEqual({
      credentials: {
        clientId: "client-id",
        id: "app-id",
        installationId: "installation-id",
        key: "private-key",
      },
      missingClientId: false,
    });
    expect(mockSecretClientConstructor).toHaveBeenCalledWith(
      "https://dx-d-itn-common-kv-01.vault.azure.net/",
    );
    expect(mockGetSecret).toHaveBeenCalledTimes(4);
    expect(queryResources).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining(
          JSON.stringify("^dx-d-(itn|weu)-common-kv-(0[1-9]|[1-9]\\d)$"),
        ),
        subscriptions: [account.id],
      }),
    );
  });

  test("uses the discovered vault even when its region and sequence differ", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValue({
      data: [{ name: "dx-d-weu-common-kv-02" }],
      totalRecords: 1,
    });
    mockGetSecret.mockImplementation(async (name: string) => ({
      value: secrets[name],
    }));

    await cloudAccountService.getRunnerAppCredentials(account, environment);
    await cloudAccountService.storeRunnerAppClientId(
      account,
      environment,
      "client-id",
    );

    expect(mockSecretClientConstructor).toHaveBeenCalledTimes(2);
    expect(mockSecretClientConstructor).toHaveBeenCalledWith(
      "https://dx-d-weu-common-kv-02.vault.azure.net/",
    );
  });

  test("does not guess a vault when discovery returns no match", async ({
    cloudAccountService,
  }) => {
    queryResources.mockResolvedValue({ data: [], totalRecords: 0 });

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).resolves.toEqual({ credentials: {}, missingClientId: false });
    expect(mockSecretClientConstructor).not.toHaveBeenCalled();
  });

  test("rejects ambiguous vault discovery", async ({ cloudAccountService }) => {
    queryResources.mockResolvedValue({
      data: [
        { name: "dx-d-itn-common-kv-01" },
        { name: "dx-d-weu-common-kv-02" },
      ],
      totalRecords: 2,
    });

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).rejects.toThrow("Multiple common Key Vaults match");
    expect(mockSecretClientConstructor).not.toHaveBeenCalled();
  });

  test("returns available credentials when a legacy vault has no client ID", async ({
    cloudAccountService,
  }) => {
    mockGetSecret.mockImplementation(async (name: string) => {
      if (name === "github-runner-app-client-id") {
        throw { statusCode: 404 };
      }
      return { value: secrets[name] };
    });

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).resolves.toEqual({
      credentials: {
        id: "app-id",
        installationId: "installation-id",
        key: "private-key",
      },
      missingClientId: true,
    });
  });

  test("returns no credentials when secret access is denied", async ({
    cloudAccountService,
  }) => {
    mockGetSecret.mockRejectedValue({ statusCode: 403 });

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).resolves.toEqual({ credentials: {}, missingClientId: false });
  });

  test("reports unexpected lookup failures", async ({
    cloudAccountService,
  }) => {
    mockGetSecret.mockRejectedValue(new Error("network error"));

    await expect(
      cloudAccountService.getRunnerAppCredentials(account, environment),
    ).rejects.toThrow("Failed to read github-runner-app-");
  });

  test("backfills the client ID without changing the existing runner secrets", async ({
    cloudAccountService,
  }) => {
    await cloudAccountService.storeRunnerAppClientId(
      account,
      environment,
      "client-id",
    );

    expect(mockSetSecret).toHaveBeenCalledExactlyOnceWith(
      "github-runner-app-client-id",
      "client-id",
    );
  });

  test("allows read-only users to continue when client ID backfill is denied", async ({
    cloudAccountService,
  }) => {
    mockSetSecret.mockRejectedValue({ statusCode: 403 });

    await expect(
      cloudAccountService.storeRunnerAppClientId(
        account,
        environment,
        "client-id",
      ),
    ).resolves.toBeUndefined();
  });
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
    expect(mockSetSecret).toHaveBeenCalledWith(
      "github-runner-app-client-id",
      "app-client-id",
    );
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
    expect(mockSetSecret).toHaveBeenCalledTimes(4);
  });
});
