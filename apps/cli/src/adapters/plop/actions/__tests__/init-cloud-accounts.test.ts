import { describe, expect, it, vi } from "vitest";

import {
  CloudAccount,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import { GitHubService } from "../../../../domain/github.js";
import { Payload } from "../../generators/environment/prompts.js";
import { initCloudAccounts } from "../init-cloud-accounts.js";

const createMockGitHubService = (): GitHubService => ({
  createBranch: vi.fn(),
  createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
  createPullRequest: vi.fn(),
  getFileContent: vi.fn(),
  getRepository: vi.fn(),
  updateFile: vi.fn(),
});

const createMockCloudAccountService = (
  overrides: Partial<CloudAccountService> = {},
): CloudAccountService => ({
  configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
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
    });

    await initCloudAccounts(payload, mockService, createMockGitHubService());

    expect(initializeMock).toHaveBeenCalledTimes(2);
    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount1,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      {
        clientId: "test-app-client-id",
        id: "test-app-id",
        installationId: "test-installation-id",
        key: "test-private-key",
      },
      {
        owner: "pagopa",
        repo: "dx",
      },
      expect.any(Object),
      {},
    );
    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount2,
      expect.objectContaining({ name: "prod", prefix: "io" }),
      {
        clientId: "test-app-client-id",
        id: "test-app-id",
        installationId: "test-installation-id",
        key: "test-private-key",
      },
      {
        owner: "pagopa",
        repo: "dx",
      },
      expect.any(Object),
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
    });

    await initCloudAccounts(payload, mockService, createMockGitHubService());

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

    await initCloudAccounts(payload, mockService, createMockGitHubService());

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
    });

    await initCloudAccounts(payload, mockService, createMockGitHubService());

    expect(initializeMock).toHaveBeenCalledWith(
      cloudAccount,
      expect.objectContaining({ name: "uat", prefix: "pagopa" }),
      {
        clientId: "test-app-client-id",
        id: "test-app-id",
        installationId: "test-installation-id",
        key: "test-private-key",
      },
      {
        owner: "pagopa",
        repo: "dx",
      },
      expect.any(Object),
      {},
    );
  });
});
