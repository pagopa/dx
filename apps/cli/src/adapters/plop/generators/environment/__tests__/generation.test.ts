import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
/**
 * Integration tests for the environment generator's file generation logic.
 *
 * These tests exercise the full Plop pipeline (template compilation +
 * file writing) in an isolated temp directory. External service calls
 * (Azure SDK, terraform fmt) are handled by:
 * - Injecting mock services via DI (CloudAccountService, GitHubService)
 * - Registering stub action types directly on the Plop instance
 * - Mocking formatTerraformCode via vi.mock() to avoid terraform CLI dependency
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { CloudAccountService } from "../../../../../domain/cloud-account.js";
import type { GitHubService } from "../../../../../domain/github.js";
import type { TerraformBackend } from "../../../../../domain/remote-backend.js";

import setGetTerraformBackend from "../../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../../actions/provision-terraform-backend.js";
import setEnvShortHelper from "../../../helpers/env-short.js";
import setEqHelper from "../../../helpers/eq.js";
import setResourcePrefixHelper from "../../../helpers/resource-prefix.js";
import {
  cleanupTempDir,
  shouldKeepTestArtifacts,
} from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_ENVIRONMENT_GENERATOR_NAME } from "../index.js";

vi.mock("../../../../terraform/fmt.js", () => ({
  formatTerraformCode: vi.fn((content: string) => content),
}));

/**
 * Register helpers and stub action types for the environment generator.
 * Cloud-service action types are registered with DI mock objects.
 */
const registerEnvironmentSetup = (
  plop: NodePlopAPI,
  mockCloudAccountService: CloudAccountService,
  mockGitHubService: GitHubService,
) => {
  setEnvShortHelper(plop);
  setResourcePrefixHelper(plop);
  setEqHelper(plop);

  setGetTerraformBackend(plop, mockCloudAccountService);
  setProvisionTerraformBackendAction(plop, mockCloudAccountService);
  setInitCloudAccountsAction(plop, mockCloudAccountService, mockGitHubService);
};

const mockTerraformBackend: TerraformBackend = {
  resourceGroupName: "dx-d-itn-tf-rg",
  storageAccountName: "dxditntfst",
  subscriptionId: "00000000-0000-0000-0000-000000000000",
  type: "azurerm",
};

const createMockCloudAccountService = (
  backend: TerraformBackend,
  isInitialized: boolean,
): CloudAccountService => ({
  getTerraformBackend: vi.fn().mockResolvedValue(backend),
  hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
  initialize: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockResolvedValue(isInitialized),
  provisionTerraformBackend: vi.fn().mockResolvedValue(backend),
});

const createMockGitHubService = (): GitHubService => ({
  createBranch: vi.fn().mockResolvedValue(undefined),
  createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
  createPullRequest: vi.fn().mockResolvedValue(undefined),
  getFileContent: vi.fn().mockResolvedValue(undefined),
  getRepository: vi.fn().mockResolvedValue(undefined),
  updateFile: vi.fn().mockResolvedValue(undefined),
});

const runEnvironmentGenerator = async ({
  mockCloudAccountService,
  mockGitHubService,
  payload,
  tmpDirPrefix,
}: {
  mockCloudAccountService: CloudAccountService;
  mockGitHubService: GitHubService;
  payload: Payload;
  tmpDirPrefix: string;
}): Promise<{
  keepArtifacts: boolean;
  originalCwd: string;
  tmpDir: string;
}> => {
  const originalCwd = process.cwd();
  const keepArtifacts = shouldKeepTestArtifacts(process.env);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), tmpDirPrefix));
  process.chdir(tmpDir);

  const templatesPath = path.resolve(
    import.meta.dirname,
    "../../../../../templates/environment",
  );

  const plop = await nodePlop();
  registerEnvironmentSetup(plop, mockCloudAccountService, mockGitHubService);

  plop.setGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "Generate a new deployment environment",
    prompts: [],
  });

  const generator = plop.getGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME);
  const result = await generator.runActions(payload);

  const realFailures = result.failures.filter(
    (f) => f.error !== "Aborted due to previous action failure",
  );
  if (realFailures.length > 0) {
    const summary = realFailures.map((f) => `${f.type}: ${f.error}`).join("\n");
    throw new Error(`Generator failed:\n${summary}`);
  }

  return { keepArtifacts, originalCwd, tmpDir };
};

describe("environment generator — file generation (no init)", () => {
  let tmpDir: string;
  let originalCwd: string;
  let keepArtifacts: boolean;

  const payload: Payload = {
    env: {
      cloudAccounts: [
        {
          csp: "azure",
          defaultLocation: "italynorth",
          displayName: "DEV-DX",
          id: "sub-dev-123",
        },
      ],
      name: "dev",
      prefix: "dx",
    },
    github: {
      owner: "pagopa",
      repo: "my-project",
    },
    tags: {
      BusinessUnit: "Platform",
      CostCenter: "TS000",
      ManagementTeam: "Engineering",
    },
    workspace: {
      domain: "payments",
    },
  };

  beforeAll(async () => {
    ({ keepArtifacts, originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService: createMockCloudAccountService(
        mockTerraformBackend,
        true,
      ),
      mockGitHubService: createMockGitHubService(),
      payload,
      tmpDirPrefix: "dx-cli-env-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir, keepArtifacts);
  });

  it("generates the workflow file for the environment", async () => {
    const workflowPath = path.join(
      tmpDir,
      ".github",
      "workflows",
      `_release-terraform-apply-bootstrapper-${payload.env.name}.yaml`,
    );
    const content = await fs.readFile(workflowPath, "utf-8");
    expect(content).toContain(payload.env.name);
    expect(content).toContain("Release Bootstrapper Infrastructure");
  });

  it("generates the bootstrapper module for the environment", async () => {
    const mainTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "main.tf",
    );
    const content = await fs.readFile(mainTf, "utf-8");
    expect(content).toContain(payload.github.owner);
    expect(content).toContain(payload.github.repo);
  });

  it("generates providers.tf with subscription ID and provider alias", async () => {
    const providersTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "providers.tf",
    );
    const content = await fs.readFile(providersTf, "utf-8");
    expect(content).toContain(payload.env.cloudAccounts[0].id);
    expect(content).toContain(payload.env.cloudAccounts[0].displayName);
    expect(content).toContain(payload.github.owner);
  });

  it("generates backend.tf with terraform backend configuration", async () => {
    const backendTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "backend.tf",
    );
    const content = await fs.readFile(backendTf, "utf-8");
    expect(content).toContain(mockTerraformBackend.resourceGroupName);
    expect(content).toContain(mockTerraformBackend.storageAccountName);
    expect(content).toContain(mockTerraformBackend.subscriptionId);
  });

  it("generates locals.tf with environment prefix and cloud accounts", async () => {
    const localsTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "locals.tf",
    );
    const content = await fs.readFile(localsTf, "utf-8");
    expect(content).toContain(payload.env.prefix);
    expect(content).toContain(payload.env.cloudAccounts[0].displayName);
    expect(content).toContain(payload.workspace.domain);
  });

  it("does NOT generate core module when init is undefined", async () => {
    const corePath = path.join(tmpDir, "infra", "core", payload.env.name);
    await expect(fs.stat(corePath)).rejects.toThrow();
  });
});

describe("environment generator — file generation (with init)", () => {
  let tmpDir: string;
  let originalCwd: string;
  let keepArtifacts: boolean;

  const cloudAccount = {
    csp: "azure" as const,
    defaultLocation: "italynorth",
    displayName: "DEV-DX",
    id: "sub-dev-123",
  };

  const payload: Payload = {
    env: {
      cloudAccounts: [cloudAccount],
      name: "dev",
      prefix: "dx",
    },
    github: {
      owner: "pagopa",
      repo: "my-project",
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
        cloudAccount,
      },
    },
    tags: {
      BusinessUnit: "Platform",
      CostCenter: "TS000",
      ManagementTeam: "Engineering",
    },
    workspace: {
      domain: "",
    },
  };

  beforeAll(async () => {
    ({ keepArtifacts, originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService: createMockCloudAccountService(
        mockTerraformBackend,
        false,
      ),
      mockGitHubService: createMockGitHubService(),
      payload,
      tmpDirPrefix: "dx-cli-env-init-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir, keepArtifacts);
  });

  it("generates the core module when init is provided", async () => {
    const mainTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "main.tf",
    );
    const stat = await fs.stat(mainTf);
    expect(stat.isFile()).toBe(true);
  });

  it("generates core providers.tf with subscription ID", async () => {
    const providersTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "providers.tf",
    );
    const content = await fs.readFile(providersTf, "utf-8");
    expect(content).toContain(cloudAccount.id);
  });

  it("generates bootstrapper module with init-specific resources", async () => {
    const mainTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "main.tf",
    );
    const content = await fs.readFile(mainTf, "utf-8");
    expect(content).toContain(payload.github.repo);
  });

  it("generates backend.tf for the core module", async () => {
    const backendTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "backend.tf",
    );
    const content = await fs.readFile(backendTf, "utf-8");
    expect(content).toContain(mockTerraformBackend.storageAccountName);
    expect(content).toContain(
      `${payload.env.prefix}.core.${payload.env.name}.tfstate`,
    );
  });

  it("generates the workflow file", async () => {
    const workflowPath = path.join(
      tmpDir,
      ".github",
      "workflows",
      `_release-terraform-apply-bootstrapper-${payload.env.name}.yaml`,
    );
    const stat = await fs.stat(workflowPath);
    expect(stat.isFile()).toBe(true);
  });
});
