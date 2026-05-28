import type { NodePlopAPI } from "node-plop";

import nodePlop from "node-plop";
/**
 * Contract tests for the environment generator.
 *
 * They generate real files in a temp directory while asserting only
 * generator-specific behavior: which domain actions run for a given
 * generator state and which high-value values are materialized into
 * the generated infrastructure files.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
import setTerraformStateKeyHelper from "../../../helpers/terraform-state-key.js";
import { resolveTemplatesPath } from "../../../templates-path.js";
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
  setTerraformStateKeyHelper(plop);

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

  const plop = await nodePlop();
  registerEnvironmentSetup(plop, mockCloudAccountService, mockGitHubService);

  plop.setGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME, {
    actions: getActions(resolveTemplatesPath("environment")),
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
  const mockCloudAccountService = createMockCloudAccountService(
    mockTerraformBackend,
    true,
  );
  const mockGitHubService = createMockGitHubService();

  beforeAll(async () => {
    ({ keepArtifacts, originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService,
      mockGitHubService,
      payload,
      tmpDirPrefix: "dx-cli-env-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir, keepArtifacts);
  });

  it("materializes bootstrapper files from payload and backend state", async () => {
    const workflowPath = path.join(
      tmpDir,
      ".github",
      "workflows",
      `_release-terraform-apply-bootstrapper-${payload.env.name}.yaml`,
    );
    const mainTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "main.tf",
    );
    const providersTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "providers.tf",
    );
    const backendTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "backend.tf",
    );
    const localsTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "locals.tf",
    );
    const [
      workflowContent,
      mainTfContent,
      providersTfContent,
      backendTfContent,
      localsTfContent,
    ] = await Promise.all([
      fs.readFile(workflowPath, "utf-8"),
      fs.readFile(mainTf, "utf-8"),
      fs.readFile(providersTf, "utf-8"),
      fs.readFile(backendTf, "utf-8"),
      fs.readFile(localsTf, "utf-8"),
    ]);

    expect(workflowContent).toContain(payload.env.name);
    expect(mainTfContent).toContain(payload.github.owner);
    expect(mainTfContent).toContain(payload.github.repo);
    expect(providersTfContent).toContain(payload.env.cloudAccounts[0].id);
    expect(providersTfContent).toContain(
      payload.env.cloudAccounts[0].displayName,
    );
    expect(providersTfContent).toContain(payload.github.owner);
    expect(backendTfContent).toContain(mockTerraformBackend.resourceGroupName);
    expect(backendTfContent).toContain(mockTerraformBackend.storageAccountName);
    expect(backendTfContent).toContain(mockTerraformBackend.subscriptionId);
    expect(localsTfContent).toContain(payload.env.prefix);
    expect(localsTfContent).toContain(payload.env.cloudAccounts[0].displayName);
    expect(localsTfContent).toContain(payload.workspace.domain);
  });

  it("skips init-only side effects and core files when init is absent", async () => {
    const corePath = path.join(tmpDir, "infra", "core", payload.env.name);
    expect(mockCloudAccountService.getTerraformBackend).toHaveBeenCalledWith(
      payload.env.cloudAccounts[0].id,
      payload.env,
    );
    expect(mockCloudAccountService.initialize).not.toHaveBeenCalled();
    expect(
      mockCloudAccountService.provisionTerraformBackend,
    ).not.toHaveBeenCalled();
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
      domain: "payments",
    },
  };
  const mockCloudAccountService = createMockCloudAccountService(
    mockTerraformBackend,
    false,
  );
  const mockGitHubService = createMockGitHubService();

  beforeAll(async () => {
    ({ keepArtifacts, originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService,
      mockGitHubService,
      payload,
      tmpDirPrefix: "dx-cli-env-init-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir, keepArtifacts);
  });

  it("runs init-specific actions when init is provided", () => {
    expect(mockCloudAccountService.initialize).toHaveBeenCalledWith(
      cloudAccount,
      payload.env,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      payload.init!.runnerAppCredentials,
      payload.github,
      mockGitHubService,
      payload.tags,
    );
    expect(
      mockCloudAccountService.provisionTerraformBackend,
    ).toHaveBeenCalledWith(cloudAccount, payload.env, payload.tags);
    expect(mockCloudAccountService.getTerraformBackend).not.toHaveBeenCalled();
  });

  it("materializes init-specific infrastructure files", async () => {
    const mainTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "main.tf",
    );
    const providersTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "providers.tf",
    );
    const backendTf = path.join(
      tmpDir,
      "infra",
      "core",
      payload.env.name,
      "backend.tf",
    );
    const bootstrapperMainTf = path.join(
      tmpDir,
      "infra",
      "bootstrapper",
      payload.env.name,
      "main.tf",
    );
    const [
      mainTfStat,
      providersTfContent,
      backendTfContent,
      bootstrapperMainTfContent,
    ] = await Promise.all([
      fs.stat(mainTf),
      fs.readFile(providersTf, "utf-8"),
      fs.readFile(backendTf, "utf-8"),
      fs.readFile(bootstrapperMainTf, "utf-8"),
    ]);

    expect(mainTfStat.isFile()).toBe(true);
    expect(providersTfContent).toContain(cloudAccount.id);
    expect(backendTfContent).toContain(mockTerraformBackend.storageAccountName);
    expect(backendTfContent).toContain(
      `${payload.env.prefix}/${payload.workspace.domain}/core.tfstate`,
    );
    expect(bootstrapperMainTfContent).toContain(payload.github.repo);
  });
});
