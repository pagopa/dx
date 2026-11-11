import { describe, expect, it, vi } from "vitest";

import {
  CloudAccount,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import { TerraformBackend } from "../../../../domain/remote-backend.js";
import { Payload } from "../../generators/environment/prompts.js";
import { provisionTerraformBackend } from "../provision-terraform-backend.js";

const createMockCloudAccountService = (
  overrides: Partial<CloudAccountService> = {},
): CloudAccountService => ({
  configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
  ensureTerraformBackendAccess: vi.fn().mockResolvedValue(undefined),
  getTerraformBackend: vi.fn().mockResolvedValue(undefined),
  hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
  initialize: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockResolvedValue(true),
  provisionTerraformBackend: vi
    .fn()
    .mockResolvedValue(createMockTerraformBackend()),
  verifyTerraformBackendReadAccess: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createMockCloudAccount = (
  overrides: Partial<CloudAccount> = {},
): CloudAccount => ({
  csp: "azure",
  defaultLocation: "westeurope",
  displayName: "Test-Account",
  id: "test-subscription-id",
  ...overrides,
});

const createMockTerraformBackend = (
  overrides: Partial<TerraformBackend> = {},
): TerraformBackend => ({
  containerName: "test-tf-state",
  resourceGroupName: "dx-d-itn-tf-rg",
  storageAccountName: "dxditntfst",
  subscriptionId: "00000000-0000-0000-0000-000000000000",
  type: "azurerm",
  ...overrides,
});

const createMockPayload = (overrides: Partial<Payload> = {}): Payload => ({
  env: {
    cloudAccounts: [createMockCloudAccount()],
    name: "dev",
    prefix: "dx",
  },
  github: {
    owner: "pagopa",
    repo: "dx",
  },
  init: {
    cloudAccountsToInitialize: [],
    runnerAppCredentials: {
      clientId: "test-app-client-id",
      id: "test-app-id",
      installationId: "test-installation-id",
      key: "test-private-key",
    },
    terraformBackend: {
      cloudAccount: createMockCloudAccount(),
    },
  },
  tags: {
    CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
    Owner: "DX Platform",
  },
  workspace: {
    domain: "test",
  },
  ...overrides,
});

describe("provisionTerraformBackend", () => {
  it("provisions the selected account and returns its backend configuration", async () => {
    const cloudAccount = createMockCloudAccount({ id: "my-subscription" });
    const mockBackend = createMockTerraformBackend();
    const provisionMock = vi.fn().mockResolvedValue(mockBackend);
    const mockService = createMockCloudAccountService({
      provisionTerraformBackend: provisionMock,
    });
    const payload = createMockPayload({
      env: {
        cloudAccounts: [createMockCloudAccount({ id: "env-account" })],
        name: "prod",
        prefix: "io",
      },
      init: {
        cloudAccountsToInitialize: [],
        runnerAppCredentials: {
          clientId: "test-app-client-id",
          id: "test-app-id",
          installationId: "test-installation-id",
          key: "test-private-key",
        },
        terraformBackend: { cloudAccount },
      },
    });

    const result = await provisionTerraformBackend(payload, mockService);

    expect(result).toEqual({
      backend: mockBackend,
      backendConfigFiles: {
        bootstrapper: undefined,
        core: undefined,
      },
      backendKey: "bootstrapper.tfstate",
      coreBackend: {
        ...mockBackend,
        containerName: "io-tf-state",
        key: "core.tfstate",
      },
    });
    expect(provisionMock).toHaveBeenCalledWith(
      cloudAccount,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      "test",
      payload.tags,
    );
    expect(mockService.ensureTerraformBackendAccess).toHaveBeenCalledWith(
      mockBackend,
      [{ ...mockBackend, containerName: "io-tf-state" }],
    );
  });

  it("should throw an error when payload.init is undefined", async () => {
    const mockService = createMockCloudAccountService();
    const payload = createMockPayload({
      init: undefined,
    });

    await expect(
      provisionTerraformBackend(payload, mockService),
    ).rejects.toThrow(
      "This action requires initialization data in the payload",
    );
  });
});
