import { describe, expect, it, vi } from "vitest";

import { CloudAccount, CloudAccountService } from "../cloud-account.js";
import {
  Environment,
  getInitializationStatus,
  getTerraformBackend,
  hasUserPermissionToInitialize,
} from "../environment.js";
import { TerraformBackend } from "../remote-backend.js";

const createMockCloudAccountService = (
  overrides: Partial<CloudAccountService> = {},
): CloudAccountService => ({
  getTerraformBackend: vi.fn().mockResolvedValue(undefined),
  hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
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
  displayName: "Test Account",
  id: "test-account-id",
  ...overrides,
});

const createMockEnvironment = (
  overrides: Partial<Environment> = {},
): Environment => ({
  cloudAccounts: [createMockCloudAccount()],
  name: "dev",
  prefix: "dx",
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

describe("getInitializationStatus", () => {
  it("should return initialized true when all cloud accounts are initialized and backend exists", async () => {
    const mockBackend = createMockTerraformBackend();
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(mockBackend),
      isInitialized: vi.fn().mockResolvedValue(true),
    });
    const environment = createMockEnvironment();

    const result = await getInitializationStatus(mockService, environment);

    expect(result).toEqual({ initialized: true });
  });

  it("should return CLOUD_ACCOUNT_NOT_INITIALIZED issue when cloud account is not initialized", async () => {
    const cloudAccount = createMockCloudAccount({ id: "uninitialized-id" });
    const mockBackend = createMockTerraformBackend();
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(mockBackend),
      isInitialized: vi.fn().mockResolvedValue(false),
    });
    const environment = createMockEnvironment({
      cloudAccounts: [cloudAccount],
    });

    const result = await getInitializationStatus(mockService, environment);

    expect(result).toEqual({
      initialized: false,
      issues: [
        {
          cloudAccount,
          type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
        },
      ],
    });
  });

  it("should return MISSING_REMOTE_BACKEND issue when terraform backend is not found", async () => {
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(true),
    });
    const environment = createMockEnvironment();

    const result = await getInitializationStatus(mockService, environment);

    expect(result).toEqual({
      initialized: false,
      issues: [
        {
          type: "MISSING_REMOTE_BACKEND",
        },
      ],
    });
  });

  it("should return multiple issues when both cloud account is not initialized and backend is missing", async () => {
    const cloudAccount = createMockCloudAccount();
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
    });
    const environment = createMockEnvironment({
      cloudAccounts: [cloudAccount],
    });

    const result = await getInitializationStatus(mockService, environment);

    expect(result).toEqual({
      initialized: false,
      issues: [
        {
          cloudAccount,
          type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
        },
        {
          type: "MISSING_REMOTE_BACKEND",
        },
      ],
    });
  });

  it("should check initialization for each cloud account with correct parameters", async () => {
    const cloudAccount1 = createMockCloudAccount({ id: "account-1" });
    const cloudAccount2 = createMockCloudAccount({ id: "account-2" });
    const mockBackend = createMockTerraformBackend();
    const isInitializedMock = vi.fn().mockResolvedValue(true);
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(mockBackend),
      isInitialized: isInitializedMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [cloudAccount1, cloudAccount2],
      name: "prod",
      prefix: "io",
    });

    await getInitializationStatus(mockService, environment);

    expect(isInitializedMock).toHaveBeenCalledTimes(2);
    expect(isInitializedMock).toHaveBeenCalledWith(
      "account-1",
      expect.objectContaining({
        name: "prod",
        prefix: "io",
      }),
    );
    expect(isInitializedMock).toHaveBeenCalledWith(
      "account-2",
      expect.objectContaining({
        name: "prod",
        prefix: "io",
      }),
    );
  });

  it("should return issues for multiple uninitialized cloud accounts", async () => {
    const cloudAccount1 = createMockCloudAccount({ id: "account-1" });
    const cloudAccount2 = createMockCloudAccount({ id: "account-2" });
    const mockBackend = createMockTerraformBackend();
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(mockBackend),
      isInitialized: vi.fn().mockResolvedValue(false),
    });
    const environment = createMockEnvironment({
      cloudAccounts: [cloudAccount1, cloudAccount2],
    });

    const result = await getInitializationStatus(mockService, environment);

    expect(result).toEqual({
      initialized: false,
      issues: [
        {
          cloudAccount: cloudAccount1,
          type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
        },
        {
          cloudAccount: cloudAccount2,
          type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
        },
      ],
    });
  });
});

describe("getTerraformBackend", () => {
  it("should return the terraform backend when it exists", async () => {
    const mockBackend = createMockTerraformBackend();
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(mockBackend),
    });
    const environment = createMockEnvironment();

    const result = await getTerraformBackend(mockService, environment);

    expect(result).toEqual(mockBackend);
  });

  it("should return undefined when no terraform backend exists", async () => {
    const mockService = createMockCloudAccountService({
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
    });
    const environment = createMockEnvironment();

    const result = await getTerraformBackend(mockService, environment);

    expect(result).toBeUndefined();
  });

  it("should call getTerraformBackend with correct parameters", async () => {
    const getTerraformBackendMock = vi.fn().mockResolvedValue(undefined);
    const mockService = createMockCloudAccountService({
      getTerraformBackend: getTerraformBackendMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [createMockCloudAccount({ id: "my-account" })],
      name: "uat",
      prefix: "io",
    });

    await getTerraformBackend(mockService, environment);

    expect(getTerraformBackendMock).toHaveBeenCalledWith(
      "my-account",
      expect.objectContaining({
        name: "uat",
        prefix: "io",
      }),
    );
  });

  it("should return the first backend found when multiple cloud accounts exist", async () => {
    const mockBackend = createMockTerraformBackend({
      storageAccountName: "firstaccountst",
    });
    const getTerraformBackendMock = vi.fn().mockResolvedValue(mockBackend);
    const mockService = createMockCloudAccountService({
      getTerraformBackend: getTerraformBackendMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [
        createMockCloudAccount({ id: "account-1" }),
        createMockCloudAccount({ id: "account-2" }),
      ],
    });

    const result = await getTerraformBackend(mockService, environment);

    expect(result).toEqual(mockBackend);
    // Should only call for the first account due to early return
    expect(getTerraformBackendMock).toHaveBeenCalledTimes(1);
  });

  it("should return undefined when environment has no cloud accounts", async () => {
    const mockService = createMockCloudAccountService();
    const environment = createMockEnvironment({
      cloudAccounts: [],
    });

    const result = await getTerraformBackend(mockService, environment);

    expect(result).toBeUndefined();
  });
});

describe("hasUserPermissionToInitialize", () => {
  it("should return true when all cloud accounts have permission", async () => {
    const mockService = createMockCloudAccountService({
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
    });
    const environment = createMockEnvironment({
      cloudAccounts: [
        createMockCloudAccount({ id: "account-1" }),
        createMockCloudAccount({ id: "account-2" }),
      ],
    });

    const result = await hasUserPermissionToInitialize(
      mockService,
      environment,
    );

    expect(result).toBe(true);
  });

  it("should return false when any cloud account lacks permission", async () => {
    const hasUserPermissionMock = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const mockService = createMockCloudAccountService({
      hasUserPermissionToInitialize: hasUserPermissionMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [
        createMockCloudAccount({ id: "account-1" }),
        createMockCloudAccount({ id: "account-2" }),
      ],
    });

    const result = await hasUserPermissionToInitialize(
      mockService,
      environment,
    );

    expect(result).toBe(false);
    expect(hasUserPermissionMock).toHaveBeenCalledTimes(2);
  });

  it("should short-circuit and return false on first unauthorized account", async () => {
    const hasUserPermissionMock = vi.fn().mockResolvedValue(false);
    const mockService = createMockCloudAccountService({
      hasUserPermissionToInitialize: hasUserPermissionMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [
        createMockCloudAccount({ id: "account-1" }),
        createMockCloudAccount({ id: "account-2" }),
        createMockCloudAccount({ id: "account-3" }),
      ],
    });

    const result = await hasUserPermissionToInitialize(
      mockService,
      environment,
    );

    expect(result).toBe(false);
    // Should only check the first account before short-circuiting
    expect(hasUserPermissionMock).toHaveBeenCalledTimes(1);
    expect(hasUserPermissionMock).toHaveBeenCalledWith("account-1");
  });

  it("should call service with correct cloud account IDs", async () => {
    const hasUserPermissionMock = vi.fn().mockResolvedValue(true);
    const mockService = createMockCloudAccountService({
      hasUserPermissionToInitialize: hasUserPermissionMock,
    });
    const environment = createMockEnvironment({
      cloudAccounts: [
        createMockCloudAccount({ id: "account-a" }),
        createMockCloudAccount({ id: "account-b" }),
      ],
    });

    await hasUserPermissionToInitialize(mockService, environment);

    expect(hasUserPermissionMock).toHaveBeenCalledTimes(2);
    expect(hasUserPermissionMock).toHaveBeenNthCalledWith(1, "account-a");
    expect(hasUserPermissionMock).toHaveBeenNthCalledWith(2, "account-b");
  });
});
