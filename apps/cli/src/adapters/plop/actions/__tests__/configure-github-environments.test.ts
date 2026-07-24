import { describe, expect, it, vi } from "vitest";

import {
  CloudAccount,
  CloudAccountService,
} from "../../../../domain/cloud-account.js";
import { GitHubService } from "../../../../domain/github.js";
import { Payload } from "../../generators/environment/prompts.js";
import { configureGitHubEnvironments } from "../configure-github-environments.js";

const createMockGitHubService = (): GitHubService => ({
  createBranch: vi.fn(),
  createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
  createPullRequest: vi.fn(),
  getFileContent: vi.fn(),
  getRepository: vi.fn(),
  updateFile: vi.fn(),
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
  tags: {},
  workspace: {
    domain: "test",
  },
  ...overrides,
});

const createMockCloudAccountService = (
  configureGitHubEnvironment: CloudAccountService["configureGitHubEnvironment"],
): CloudAccountService => ({
  configureGitHubEnvironment,
  getTerraformBackend: vi.fn().mockResolvedValue(undefined),
  hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
  initialize: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockResolvedValue(true),
  provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
});

describe("configureGitHubEnvironments", () => {
  it("configures GitHub environment access for every selected cloud account", async () => {
    const account1 = createMockCloudAccount({ id: "account-1" });
    const account2 = createMockCloudAccount({ id: "account-2" });
    const configureGitHubEnvironment = vi.fn().mockResolvedValue(undefined);
    const cloudAccountService = createMockCloudAccountService(
      configureGitHubEnvironment,
    );
    const gitHubService = createMockGitHubService();
    const payload = createMockPayload({
      env: {
        cloudAccounts: [account1, account2],
        name: "ced-prod",
        prefix: "ced",
      },
    });

    await configureGitHubEnvironments(
      payload,
      cloudAccountService,
      gitHubService,
    );

    expect(configureGitHubEnvironment).toHaveBeenCalledTimes(2);
    expect(configureGitHubEnvironment).toHaveBeenCalledWith(
      account1,
      payload.env,
      payload.github,
      gitHubService,
      undefined,
    );
    expect(configureGitHubEnvironment).toHaveBeenCalledWith(
      account2,
      payload.env,
      payload.github,
      gitHubService,
      undefined,
    );
  });

  it("passes runner app credentials when the environment was initialized in the same run", async () => {
    const configureGitHubEnvironment = vi.fn().mockResolvedValue(undefined);
    const cloudAccountService = createMockCloudAccountService(
      configureGitHubEnvironment,
    );
    const gitHubService = createMockGitHubService();
    const runnerAppCredentials = {
      clientId: "client-id",
      id: "app-id",
      installationId: "installation-id",
      key: "private-key",
    };
    const payload = createMockPayload({
      init: {
        cloudAccountsToInitialize: [createMockCloudAccount()],
        runnerAppCredentials,
      },
    });

    await configureGitHubEnvironments(
      payload,
      cloudAccountService,
      gitHubService,
    );

    expect(configureGitHubEnvironment).toHaveBeenCalledWith(
      expect.any(Object),
      payload.env,
      payload.github,
      gitHubService,
      runnerAppCredentials,
    );
  });
});
