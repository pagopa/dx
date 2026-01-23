import { describe, expect, it, vi } from "vitest";

import {
  CloudAccount,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import { Payload } from "../../generators/environment/prompts.js";
import { initCloudAccounts } from "../init-cloud-accounts.js";

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

describe("initCloudAccounts", () => {
  it("should initialize all cloud accounts in cloudAccountsToInitialize", async () => {
    const cloudAccount1 = createMockCloudAccount({ id: "account-1" });
    const cloudAccount2 = createMockCloudAccount({ id: "account-2" });
    const initializeMock = vi.fn().mockResolvedValue(undefined);
    const mockService = createMockCloudAccountService({
      initialize: initializeMock,
    });
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "prod",
        prefix: "io",
      },
      init: {
        cloudAccountsToInitialize: [cloudAccount1, cloudAccount2],
        terraformBackend: {
          cloudAccount: createMockCloudAccount(),
        },
      },
    });

    await initCloudAccounts(payload, mockService);

    expect(initializeMock).toHaveBeenCalledTimes(2);
    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount1,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      {},
    );
    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount2,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      {},
    );
  });

  it("should not call initialize when cloudAccountsToInitialize is empty", async () => {
    const initializeMock = vi.fn().mockResolvedValue(undefined);
    const mockService = createMockCloudAccountService({
      initialize: initializeMock,
    });
    const payload = createMockPayload({
      init: {
        cloudAccountsToInitialize: [],
        terraformBackend: {
          cloudAccount: createMockCloudAccount(),
        },
      },
    });

    await initCloudAccounts(payload, mockService);

    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("should not call initialize when payload.init is undefined", async () => {
    const initializeMock = vi.fn().mockResolvedValue(undefined);
    const mockService = createMockCloudAccountService({
      initialize: initializeMock,
    });
    const payload = createMockPayload({
      init: undefined,
    });

    await initCloudAccounts(payload, mockService);

    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("should use prefix and environment name from payload.env", async () => {
    const cloudAccount = createMockCloudAccount();
    const initializeMock = vi.fn().mockResolvedValue(undefined);
    const mockService = createMockCloudAccountService({
      initialize: initializeMock,
    });
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "uat",
        prefix: "pagopa",
      },
      init: {
        cloudAccountsToInitialize: [cloudAccount],
        terraformBackend: {
          cloudAccount: createMockCloudAccount(),
        },
      },
    });

    await initCloudAccounts(payload, mockService);

    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount,
      expect.objectContaining({ name: "uat", prefix: "pagopa" }),
      {},
    );
  });
});
