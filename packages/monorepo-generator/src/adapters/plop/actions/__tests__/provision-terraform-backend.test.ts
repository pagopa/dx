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
  getTerraformBackend: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockResolvedValue(true),
  provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
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
    terraformBackend: {
      cloudAccount: createMockCloudAccount(),
    },
  },
  tags: {},
  workspace: {
    domain: "test",
  },
  ...overrides,
});

describe("provisionTerraformBackend", () => {
  it("should provision terraform backend and return it", async () => {
    const mockBackend = createMockTerraformBackend();
    const provisionMock = vi.fn().mockResolvedValue(mockBackend);
    const mockService = createMockCloudAccountService({
      provisionTerraformBackend: provisionMock,
    });
    const payload = createMockPayload();

    const result = await provisionTerraformBackend(payload, mockService);

    expect(result).toEqual(mockBackend);
  });

  it("should call provisionTerraformBackend with correct parameters", async () => {
    const cloudAccount = createMockCloudAccount({ id: "my-subscription" });
    const provisionMock = vi
      .fn()
      .mockResolvedValue(createMockTerraformBackend());
    const mockService = createMockCloudAccountService({
      provisionTerraformBackend: provisionMock,
    });
    const payload = createMockPayload({
      env: {
        cloudAccounts: [cloudAccount],
        name: "prod",
        prefix: "io",
      },
      init: {
        cloudAccountsToInitialize: [],
        terraformBackend: {
          cloudAccount,
        },
      },
    });

    await provisionTerraformBackend(payload, mockService);

    expect(provisionMock).toHaveBeenCalledWith(
      cloudAccount,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      {},
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

  it("should use the terraformBackend cloudAccount from init", async () => {
    const envCloudAccount = createMockCloudAccount({ id: "env-account" });
    const backendCloudAccount = createMockCloudAccount({
      id: "backend-account",
    });
    const provisionMock = vi
      .fn()
      .mockResolvedValue(createMockTerraformBackend());
    const mockService = createMockCloudAccountService({
      provisionTerraformBackend: provisionMock,
    });
    const payload = createMockPayload({
      env: {
        cloudAccounts: [envCloudAccount],
        name: "uat",
        prefix: "dx",
      },
      init: {
        cloudAccountsToInitialize: [],
        terraformBackend: {
          cloudAccount: backendCloudAccount,
        },
      },
    });

    await provisionTerraformBackend(payload, mockService);

    expect(provisionMock).toHaveBeenCalledWith(
      backendCloudAccount,
      expect.objectContaining({ name: "uat", prefix: "dx" }),
      {},
    );
  });
});
