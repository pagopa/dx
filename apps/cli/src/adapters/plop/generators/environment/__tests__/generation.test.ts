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
import setSyncRepositoryEnvironmentsAction from "../../../actions/sync-repository-environments.js";
import setEnvShortHelper from "../../../helpers/env-short.js";
import setEqHelper from "../../../helpers/eq.js";
import setResourcePrefixHelper from "../../../helpers/resource-prefix.js";
import setTerraformStateKeyHelper from "../../../helpers/terraform-state-key.js";
import { resolveTemplatesPath } from "../../../templates-path.js";
import {
  cleanupTempDir,
  readGeneratedFiles,
} from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_ENVIRONMENT_GENERATOR_NAME } from "../index.js";

vi.mock("../../../../terraform/fmt.js", () => ({
  formatTerraformCode: vi.fn((content: string) => content),
}));
vi.mock("../../../../execa/terraform.js", () => {
  const terraformCommand = vi.fn(async () => undefined);
  const tf$ = vi.fn(() => terraformCommand);

  return { tf$ };
});

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
  setSyncRepositoryEnvironmentsAction(plop);
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
  originalCwd: string;
  tmpDir: string;
}> => {
  const originalCwd = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), tmpDirPrefix));
  process.chdir(tmpDir);
  await fs.mkdir(path.join(tmpDir, "infra", "repository"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(tmpDir, "infra", "repository", "main.tf"),
    [
      'module "github_repository" {',
      '  source  = "pagopa-dx/github-environment-bootstrap/github"',
      '  version = "~> 1.0"',
      "",
      "  repository = {",
      '    name                   = "my-project"',
      '    description            = "My project"',
      "    topics                 = []",
      "    reviewers_teams        = []",
      "  }",
      "}",
      "",
    ].join("\n"),
  );

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

  return { originalCwd, tmpDir };
};

describe("environment generator — file generation (no init)", () => {
  let tmpDir: string;
  let originalCwd: string;

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
    ({ originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService,
      mockGitHubService,
      payload,
      tmpDirPrefix: "dx-cli-env-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("materializes bootstrapper files from payload and backend state", async () => {
    const generatedFiles = await readGeneratedFiles(tmpDir, [
      `.github/workflows/_release-terraform-apply-bootstrapper-${payload.env.name}.yaml`,
      "infra/repository/main.tf",
      `infra/bootstrapper/${payload.env.name}/main.tf`,
      `infra/bootstrapper/${payload.env.name}/providers.tf`,
      `infra/bootstrapper/${payload.env.name}/backend.tf`,
      `infra/bootstrapper/${payload.env.name}/locals.tf`,
    ]);

    expect(generatedFiles).toMatchSnapshot();
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
    ({ originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService,
      mockGitHubService,
      payload,
      tmpDirPrefix: "dx-cli-env-init-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
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
    const generatedFiles = await readGeneratedFiles(tmpDir, [
      `infra/core/${payload.env.name}/main.tf`,
      `infra/core/${payload.env.name}/providers.tf`,
      `infra/core/${payload.env.name}/backend.tf`,
      `infra/bootstrapper/${payload.env.name}/main.tf`,
    ]);

    expect(generatedFiles).toMatchSnapshot();
  });
});
