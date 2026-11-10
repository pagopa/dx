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

import setConfigureExistingTerraformRootBackendsAction from "../../../actions/configure-existing-terraform-root-backends.js";
import setConfigureGitHubEnvironmentsAction from "../../../actions/configure-github-environments.js";
import setGetTerraformBackend from "../../../actions/get-terraform-backend.js";
import setInitCloudAccountsAction from "../../../actions/init-cloud-accounts.js";
import setProvisionTerraformBackendAction from "../../../actions/provision-terraform-backend.js";
import setSyncNxAdditionalEnvironments from "../../../actions/sync-nx-additional-environments.js";
import setSyncRepositoryEnvironmentsAction from "../../../actions/sync-repository-environments.js";
import setEnvShortHelper from "../../../helpers/env-short.js";
import setEqHelper from "../../../helpers/eq.js";
import setResourcePrefixHelper from "../../../helpers/resource-prefix.js";
import setTerraformStateContainerReaderKeyHelper from "../../../helpers/terraform-state-container-reader-key.js";
import setTerraformStringHelper from "../../../helpers/terraform-string.js";
import { resolveTemplatesPath } from "../../../templates-path.js";
import {
  cleanupTempDir,
  readGeneratedFiles,
} from "../../__tests__/temp-dir.js";
import getActions from "../actions.js";
import { Payload, PLOP_ENVIRONMENT_GENERATOR_NAME } from "../index.js";

const terraformValidator = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../../../execa/terraform.js", () => {
  const terraformCommand = vi.fn(async () => undefined);
  const tf$ = vi.fn(() => terraformCommand);

  return { tf$, validateTerraformSource: terraformValidator };
});

/**
 * Register helpers and stub action types for the environment generator.
 * Cloud-service action types are registered with DI mock objects.
 */
const registerEnvironmentSetup = (
  plop: NodePlopAPI,
  mockCloudAccountService: CloudAccountService,
  mockGitHubService: GitHubService,
  initializeTerraformProjects: () => Promise<string>,
) => {
  plop.setActionType(
    "setupCloudTools",
    async () => "Cloud CLI tools configured",
  );
  // The formatting pass shells out to the repository Nx tasks: it is covered
  // by its own test, and stubbed here to keep the generated files untouched.
  plop.setActionType(
    "formatGeneratedCode",
    async () => "Generated files formatted",
  );
  // The Terraform initialization shells out to the repository Nx tasks too:
  // it is covered by its own test, and stubbed here to keep the generation
  // offline.
  plop.setActionType("initTerraformProjects", initializeTerraformProjects);
  setEnvShortHelper(plop);
  setResourcePrefixHelper(plop);
  setEqHelper(plop);
  setTerraformStringHelper(plop);
  setTerraformStateContainerReaderKeyHelper(plop);

  setGetTerraformBackend(plop, mockCloudAccountService);
  setConfigureExistingTerraformRootBackendsAction(plop);
  setProvisionTerraformBackendAction(plop, mockCloudAccountService);
  setInitCloudAccountsAction(plop, mockCloudAccountService, mockGitHubService);
  setConfigureGitHubEnvironmentsAction(
    plop,
    mockCloudAccountService,
    mockGitHubService,
  );
  setSyncNxAdditionalEnvironments(plop);
  setSyncRepositoryEnvironmentsAction(plop);
};

const mockTerraformBackend: TerraformBackend = {
  containerName: "payments-tf-state",
  resourceGroupName: "dx-d-itn-tf-rg",
  storageAccountName: "dxditntfst",
  subscriptionId: "00000000-0000-0000-0000-000000000000",
  type: "azurerm",
};

const createMockCloudAccountService = (
  backend: TerraformBackend,
  isInitialized: boolean,
): CloudAccountService => ({
  configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
  ensureTerraformBackendAccess: vi.fn().mockResolvedValue(undefined),
  getTerraformBackend: vi.fn().mockResolvedValue(backend),
  hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
  initialize: vi.fn().mockResolvedValue(undefined),
  isInitialized: vi.fn().mockResolvedValue(isInitialized),
  provisionTerraformBackend: vi.fn().mockResolvedValue(backend),
  verifyTerraformBackendReadAccess: vi.fn().mockResolvedValue(undefined),
});

const createMockGitHubService = (): GitHubService => ({
  createBranch: vi.fn().mockResolvedValue(undefined),
  createOrUpdateEnvironmentSecret: vi.fn().mockResolvedValue(undefined),
  createPullRequest: vi.fn().mockResolvedValue(undefined),
  getFileContent: vi.fn().mockResolvedValue(undefined),
  getRepository: vi.fn().mockResolvedValue(undefined),
  updateFile: vi.fn().mockResolvedValue(undefined),
});

const expectNoExternalCalls = (...services: object[]) => {
  for (const service of services) {
    Object.values(service).forEach((method) =>
      expect(method).not.toHaveBeenCalled(),
    );
  }
};

const runEnvironmentGenerator = async ({
  files = {},
  initializeTerraformProjects = async () =>
    "Generated Terraform projects initialized",
  mockCloudAccountService = createMockCloudAccountService(
    mockTerraformBackend,
    true,
  ),
  mockGitHubService = createMockGitHubService(),
  payload: environmentPayload = payload,
  prepareRepository,
  tmpDirPrefix = "dx-cli-env-test-",
  workspacePath,
}: {
  files?: Record<string, string>;
  initializeTerraformProjects?: () => Promise<string>;
  mockCloudAccountService?: CloudAccountService;
  mockGitHubService?: GitHubService;
  payload?: Payload;
  prepareRepository?: (tmpDir: string) => Promise<void>;
  tmpDirPrefix?: string;
  workspacePath?: string;
}): Promise<{
  originalCwd: string;
  tmpDir: string;
}> => {
  const originalCwd = process.cwd();
  const tmpDir =
    workspacePath ?? (await fs.mkdtemp(path.join(os.tmpdir(), tmpDirPrefix)));
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

  for (const [file, content] of Object.entries(files)) {
    const absolutePath = path.join(tmpDir, file);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
  }
  await prepareRepository?.(tmpDir);

  const plop = await nodePlop();
  registerEnvironmentSetup(
    plop,
    mockCloudAccountService,
    mockGitHubService,
    initializeTerraformProjects,
  );

  plop.setGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME, {
    actions: getActions(resolveTemplatesPath("environment")),
    description: "Generate a new deployment environment",
    prompts: [],
  });

  const generator = plop.getGenerator(PLOP_ENVIRONMENT_GENERATOR_NAME);
  const result = await generator.runActions(
    structuredClone(environmentPayload),
  );

  const realFailures = result.failures.filter(
    (f) => f.error !== "Aborted due to previous action failure",
  );
  if (realFailures.length > 0) {
    const summary = realFailures.map((f) => `${f.type}: ${f.error}`).join("\n");
    throw new Error(`Generator failed:\n${summary}`);
  }

  return { originalCwd, tmpDir };
};

const withGeneratedEnvironment = async (
  options: Parameters<typeof runEnvironmentGenerator>[0],
  verify: (tmpDir: string) => Promise<void>,
): Promise<void> => {
  const generated = await runEnvironmentGenerator(options);
  try {
    await verify(generated.tmpDir);
  } finally {
    process.chdir(generated.originalCwd);
    await cleanupTempDir(generated.tmpDir);
  }
};

const expectGenerationFailure = async (
  options: Parameters<typeof runEnvironmentGenerator>[0],
  error: RegExp | string,
  verify?: (tmpDir: string) => Promise<void>,
): Promise<void> => {
  const originalCwd = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dx-cli-failure-"));
  try {
    await expect(
      runEnvironmentGenerator({ ...options, workspacePath: tmpDir }),
    ).rejects.toThrow(error);
    await verify?.(tmpDir);
  } finally {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  }
};

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
  runnerAppCredentials: {
    clientId: "test-app-client-id",
    id: "test-app-id",
    installationId: "test-installation-id",
    key: "test-private-key",
  },
  tags: {
    CostCenter: "TS330 - PDND & INTEROPERABILITA'",
    Owner: "DX Platform",
  },
  workspace: {
    domain: "payments",
  },
};

const tenantPayload = (): Payload => ({
  ...payload,
  env: { ...payload.env, name: "ced-prod", prefix: "ced" },
  workspace: { domain: "ced" },
});

const azureAccounts = [
  ...payload.env.cloudAccounts,
  {
    csp: "azure" as const,
    defaultLocation: "westeurope",
    displayName: "PROD-IO",
    id: "sub-prod-123",
  },
];

const terraformMain = 'terraform { required_version = ">= 1.0" }\n';
const backendHcl = (
  overrides: Partial<TerraformBackend> & { key?: string } = {},
): string => {
  const {
    containerName,
    key = "legacy/custom.tfstate",
    resourceGroupName,
    storageAccountName,
    subscriptionId,
  } = { ...mockTerraformBackend, ...overrides };
  return `terraform {
  backend "azurerm" {
    resource_group_name  = "${resourceGroupName}"
    storage_account_name = "${storageAccountName}"
    container_name       = "${containerName}"
    key                  = "${key}"
    subscription_id      = "${subscriptionId}"
    tenant_id            = "11111111-1111-1111-1111-111111111111"
    use_azuread_auth     = true
  }
}
`;
};

describe("existing Terraform backend file preservation", () => {
  it.each([
    { backendFileName: "backend.tf", layer: "bootstrapper" },
    { backendFileName: "providers.tf", layer: "bootstrapper" },
    { backendFileName: "main.tf", layer: "bootstrapper" },
    { backendFileName: "backend.tf", layer: "core" },
    { backendFileName: "providers.tf", layer: "core" },
    { backendFileName: "main.tf", layer: "core" },
  ])(
    "preserves $layer backend configuration in $backendFileName",
    async ({ backendFileName, layer }) => {
      const existingBackendPayload = structuredClone(payload);
      existingBackendPayload.init = {
        cloudAccountsToInitialize: [],
        terraformBackend: { cloudAccount },
      };
      const backendContent = backendHcl({
        containerName: "legacy-state",
      });
      const backendRoot = `infra/${layer}/${payload.env.name}`;
      const backendFile = `${backendRoot}/${backendFileName}`;
      const cloudAccountService = createMockCloudAccountService(
        mockTerraformBackend,
        true,
      );
      await withGeneratedEnvironment(
        {
          files: { [backendFile]: backendContent },
          mockCloudAccountService: cloudAccountService,
          payload: existingBackendPayload,
        },
        async (tmpDir) => {
          for (let run = 0; run < 2; run += 1) {
            if (run > 0) {
              await runEnvironmentGenerator({
                mockCloudAccountService: cloudAccountService,
                payload: existingBackendPayload,
                workspacePath: tmpDir,
              });
            }
            await expect(
              fs.readFile(path.join(tmpDir, backendFile), "utf8"),
            ).resolves.toBe(backendContent);
            const filesOnDisk = await fs.readdir(
              path.join(tmpDir, backendRoot),
            );
            expect(filesOnDisk).toContain(backendFileName);
            expect(filesOnDisk.includes("backend.tf")).toBe(
              backendFileName === "backend.tf",
            );
          }
          expect(
            cloudAccountService.ensureTerraformBackendAccess,
          ).toHaveBeenCalledWith(
            {
              ...mockTerraformBackend,
              containerName:
                layer === "bootstrapper"
                  ? "legacy-state"
                  : mockTerraformBackend.containerName,
            },
            layer === "core"
              ? []
              : [{ ...mockTerraformBackend, containerName: "dx-tf-state" }],
          );
          expect(
            vi.mocked(cloudAccountService.verifyTerraformBackendReadAccess).mock
              .lastCall,
          ).toEqual([
            {
              ...mockTerraformBackend,
              containerName: layer === "core" ? "legacy-state" : "dx-tf-state",
            },
            layer === "core" ? "legacy/custom.tfstate" : "core.tfstate",
          ]);
          expect(
            cloudAccountService.provisionTerraformBackend,
          ).toHaveBeenCalledTimes(layer === "core" ? 1 : 0);
        },
      );
    },
  );
});

describe("nested Terraform backend roots", () => {
  it.each(["bootstrapper", "core"])(
    "rejects a nested %s backend before generating a direct root",
    async (layer) => {
      const tenantEnvironment = tenantPayload();
      if (layer === "core") {
        tenantEnvironment.init = { cloudAccountsToInitialize: [] };
      }
      const mockCloudAccountService = createMockCloudAccountService(
        mockTerraformBackend,
        true,
      );
      await expectGenerationFailure(
        {
          files: {
            [`infra/${layer}/prod/ced/providers.tf`]: backendHcl(),
          },
          mockCloudAccountService,
          payload: tenantEnvironment,
        },
        `Existing Terraform backend is in infra/${layer}/prod/ced, but this command generates infra/${layer}/ced-prod`,
        async (tmpDir) => {
          await expect(
            fs.stat(path.join(tmpDir, "infra", layer, "ced-prod")),
          ).rejects.toThrow();
          expectNoExternalCalls(mockCloudAccountService);
        },
      );
    },
  );
});

describe("nested Terraform root backend generation", () => {
  it.each([
    ["infra/resources/dev", "resources.tfstate"],
    ["infra/resources/dev/frontend", "resources/frontend.tfstate"],
    [
      "infra/resources/dev/frontend/mobile",
      "resources/frontend/mobile.tfstate",
    ],
    ["infra/resources/dev/payments/frontend", "resources/frontend.tfstate"],
    ["infra/resources/prod/ced/frontend", "resources/frontend.tfstate"],
  ])("adds the derived backend to %s", async (root, expectedKey) => {
    await withGeneratedEnvironment(
      {
        files: { [`${root}/main.tf`]: terraformMain },
        payload: root.includes("/prod/ced/") ? tenantPayload() : payload,
      },
      async (tmpDir) => {
        const backendContent = await fs.readFile(
          path.join(tmpDir, root, "backend.tf"),
          "utf8",
        );
        expect(backendContent).toContain(
          'container_name       = "payments-tf-state"',
        );
        expect(backendContent).toContain(
          `key                  = "${expectedKey}"`,
        );
        expect(backendContent).toContain('storage_account_name = "dxditntfst"');
      },
    );
  });
});

describe("nested backend preservation", () => {
  it("preserves an existing nested backend file byte-for-byte", async () => {
    const root = "infra/resources/dev/frontend/mobile";
    const existingBackend = backendHcl({
      containerName: "legacy-state",
      key: "custom/legacy.tfstate",
      resourceGroupName: "legacy-rg",
      storageAccountName: "legacystorage",
      subscriptionId: "legacy-subscription",
    });
    await withGeneratedEnvironment(
      {
        files: {
          [`${root}/main.tf`]: terraformMain,
          [`${root}/providers.tf`]: existingBackend,
        },
      },
      async (tmpDir) => {
        const rootPath = path.join(tmpDir, root);
        await expect(
          fs.readFile(path.join(rootPath, "providers.tf"), "utf8"),
        ).resolves.toBe(existingBackend);
        await expect(
          fs.stat(path.join(rootPath, "backend.tf")),
        ).rejects.toThrow();
      },
    );
  });
});

describe("local Terraform state protection", () => {
  it.each([
    { file: "terraform.tfstate", reason: "local Terraform state" },
    { file: "terraform.tfstate.backup", reason: "local Terraform state" },
    { file: ".terraform/terraform.tfstate", reason: "backend metadata" },
    {
      file: ".terraform/terraform.tfstate.backup",
      reason: "backend metadata",
    },
    { file: "backend.tf", reason: "backend.tf already exists" },
    {
      file: "terraform.tfstate",
      includeMain: false,
      reason: "state without main.tf",
      root: "infra/bootstrapper/dev",
    },
    {
      file: ".terraform/terraform.tfstate",
      includeMain: false,
      reason: "metadata without main.tf",
      root: "infra/core/dev",
    },
  ])(
    "stops before cloud or backend writes when $reason exists",
    async ({
      file,
      includeMain = true,
      root = "infra/resources/dev/frontend/mobile",
    }) => {
      const content =
        file === "backend.tf" ? "locals { keep = true }\n" : "local state\n";
      const expectedError =
        file === "backend.tf"
          ? /backend\.tf already exists/u
          : /local Terraform state or backend metadata exists/u;
      const initializeTerraformProjects = vi.fn(async () => "initialized");
      const cloudAccountService = createMockCloudAccountService(
        mockTerraformBackend,
        true,
      );
      const gitHubService = createMockGitHubService();
      const files = {
        ...(includeMain ? { [`${root}/main.tf`]: terraformMain } : {}),
        [`${root}/${file}`]: content,
      };

      await expectGenerationFailure(
        {
          files,
          initializeTerraformProjects,
          mockCloudAccountService: cloudAccountService,
          mockGitHubService: gitHubService,
          payload,
        },
        expectedError,
        async (tmpDir) => {
          expectNoExternalCalls(cloudAccountService, gitHubService, {
            initializeTerraformProjects,
          });
          await expect(
            readGeneratedFiles(tmpDir, Object.keys(files)),
          ).resolves.toEqual(files);
          const filesOnDisk = await fs.readdir(path.join(tmpDir, root));
          expect(filesOnDisk.includes("backend.tf")).toBe(
            file === "backend.tf",
          );
        },
      );
    },
  );
});

describe("invalid nested backend configurations", () => {
  it.each([
    {
      content: backendHcl().replace(
        '"payments-tf-state"',
        "var.state_container",
      ),
      error: /Cannot resolve "container_name"/u,
      name: "dynamic coordinates",
    },
    {
      content: backendHcl().replace("payments-tf-state", "${local.container}"),
      error: /literal string/u,
      name: "interpolated coordinates",
    },
    {
      content: backendHcl() + backendHcl(),
      error: /backend block/u,
      name: "duplicate backends",
    },
    {
      content: backendHcl().replace(/^\s*subscription_id.*$/mu, ""),
      error: /subscription_id/u,
      name: "partial configuration",
    },
    {
      content: '{"terraform":{"backend":{"azurerm":{}}}}',
      error: /JSON Terraform backend/u,
      file: "providers.tf.json",
      name: "JSON backend",
    },
  ])(
    "rejects $name before external calls",
    async ({ content, error, file = "providers.tf" }) => {
      const root = "infra/resources/dev/frontend";
      const cloudAccountService = createMockCloudAccountService(
        mockTerraformBackend,
        true,
      );
      const gitHubService = createMockGitHubService();

      await expectGenerationFailure(
        {
          files: {
            [`${root}/${file}`]: content,
            [`${root}/main.tf`]: terraformMain,
          },
          mockCloudAccountService: cloudAccountService,
          mockGitHubService: gitHubService,
        },
        error,
        async (tmpDir) => {
          expectNoExternalCalls(cloudAccountService, gitHubService);
          await expect(
            fs.stat(path.join(tmpDir, root, "backend.tf")),
          ).rejects.toThrow();
        },
      );
    },
  );
});

describe("ambiguous nested backend layouts", () => {
  it.each([
    ["bootstrapper.tfstate", "payments-tf-state"],
    ["core.tfstate", "dx-tf-state"],
  ])(
    "rejects a root sharing the generated %s location",
    async (key, containerName) => {
      await expectGenerationFailure(
        {
          files: {
            "infra/resources/dev/main.tf": terraformMain,
            "infra/resources/dev/providers.tf": backendHcl({
              containerName,
              key,
            }),
          },
        },
        /same state key/u,
        async (tmpDir) => {
          await expect(
            fs.stat(path.join(tmpDir, "infra/bootstrapper/dev")),
          ).rejects.toThrow();
        },
      );
    },
  );

  it("rejects direct and legacy roots that would share one state key", async () => {
    const rootPaths = [
      "infra/resources/ced-prod/frontend",
      "infra/resources/prod/ced/frontend",
    ];
    const tenantEnvironment = tenantPayload();
    const cloudAccountService = createMockCloudAccountService(
      mockTerraformBackend,
      true,
    );
    const gitHubService = createMockGitHubService();

    await expectGenerationFailure(
      {
        files: Object.fromEntries(
          rootPaths.map((root) => [`${root}/main.tf`, terraformMain]),
        ),
        mockCloudAccountService: cloudAccountService,
        mockGitHubService: gitHubService,
        payload: tenantEnvironment,
      },
      /both represent resources\/frontend/u,
      async (tmpDir) => {
        expectNoExternalCalls(cloudAccountService, gitHubService);
        await Promise.all(
          rootPaths.map((root) =>
            expect(
              fs.stat(path.join(tmpDir, root, "backend.tf")),
            ).rejects.toThrow(),
          ),
        );
      },
    );
  });
});

describe("environment generator — file generation (no init)", () => {
  let tmpDir: string;
  let originalCwd: string;

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
    const generatedContent = Object.values(generatedFiles).join("\n");
    expect(generatedContent).not.toContain("test-private-key");
    expect(generatedContent).not.toContain("github_environment_prefix_enabled");
  });

  it("uses the selected GitHub organization in generated bootstrapper files", async () => {
    const customPayload: Payload = {
      ...payload,
      github: {
        ...payload.github,
        owner: "example-org",
      },
    };
    const generatedEnvironment = await runEnvironmentGenerator({
      mockCloudAccountService: createMockCloudAccountService(
        mockTerraformBackend,
        true,
      ),
      mockGitHubService: createMockGitHubService(),
      payload: customPayload,
      tmpDirPrefix: "dx-cli-env-custom-owner-test-",
    });

    try {
      const generatedFiles = await readGeneratedFiles(
        generatedEnvironment.tmpDir,
        [
          `infra/bootstrapper/${customPayload.env.name}/providers.tf`,
          `infra/bootstrapper/${customPayload.env.name}/main.tf`,
        ],
      );
      const providersFile =
        generatedFiles[
          `infra/bootstrapper/${customPayload.env.name}/providers.tf`
        ];
      const mainFile =
        generatedFiles[`infra/bootstrapper/${customPayload.env.name}/main.tf`];

      expect(providersFile).toContain('owner = "example-org"');
      expect(mainFile).toContain('owner    = "example-org"');
      expect(mainFile).toContain(
        "https://github.com/example-org/my-project/blob/main/infra/bootstrapper/dev",
      );
      expect(mainFile).not.toContain('owner    = "pagopa"');
    } finally {
      process.chdir(generatedEnvironment.originalCwd);
      await cleanupTempDir(generatedEnvironment.tmpDir);
    }
  });

  it("passes the selected GitHub owner ID into generated bootstrapper Terraform", async () => {
    const userPayload: Payload = {
      ...payload,
      github: {
        ...payload.github,
        owner: "example-user",
        ownerId: 54321,
      },
    };
    const generatedEnvironment = await runEnvironmentGenerator({
      mockCloudAccountService: createMockCloudAccountService(
        mockTerraformBackend,
        true,
      ),
      mockGitHubService: createMockGitHubService(),
      payload: userPayload,
      tmpDirPrefix: "dx-cli-env-user-owner-test-",
    });

    try {
      const generatedFiles = await readGeneratedFiles(
        generatedEnvironment.tmpDir,
        [`infra/bootstrapper/${userPayload.env.name}/main.tf`],
      );
      const mainFile =
        generatedFiles[`infra/bootstrapper/${userPayload.env.name}/main.tf`];

      expect(mainFile).toContain('owner    = "example-user"');
      expect(mainFile).toContain("owner_id = 54321");
    } finally {
      process.chdir(generatedEnvironment.originalCwd);
      await cleanupTempDir(generatedEnvironment.tmpDir);
    }
  });

  it("recovers a missing core without cloud initialization and preserves it on rerun", async () => {
    const corePath = path.join(tmpDir, "infra", "core", payload.env.name);
    expect(mockCloudAccountService.getTerraformBackend).toHaveBeenCalledWith(
      payload.env.cloudAccounts[0].id,
      payload.env,
      payload.workspace.domain,
    );
    expect(mockCloudAccountService.initialize).not.toHaveBeenCalled();
    expect(
      mockCloudAccountService.provisionTerraformBackend,
    ).not.toHaveBeenCalled();
    await expect(
      fs.readFile(path.join(corePath, "backend.tf"), "utf8"),
    ).resolves.toContain('key                  = "core.tfstate"');
    await expect(
      fs.readFile(path.join(corePath, "backend.tf"), "utf8"),
    ).resolves.toContain('container_name       = "dx-tf-state"');
    await expect(
      fs.readFile(path.join(corePath, "imports.tf"), "utf8"),
    ).resolves.toMatch(/domain = ""[\s\S]*domain = ""/u);
    await fs.appendFile(
      path.join(corePath, "main.tf"),
      "\n# Keep customization\n",
    );
    const coreFiles = (await fs.readdir(corePath)).map(
      (file) => `infra/core/${payload.env.name}/${file}`,
    );
    const before = await readGeneratedFiles(tmpDir, coreFiles);
    await runEnvironmentGenerator({
      mockCloudAccountService,
      mockGitHubService,
      workspacePath: tmpDir,
    });
    await expect(readGeneratedFiles(tmpDir, coreFiles)).resolves.toEqual(
      before,
    );
    expect(mockCloudAccountService.initialize).not.toHaveBeenCalled();
  });
});

describe("generated core-state Reader configuration", () => {
  it.each([
    {
      backendFile: "infra/core/dev/payments/providers.tf",
      expectedUpstream: '"legacy-core-state" = {',
      name: "distinct core container in the same storage account",
      upstreamBackend: {
        ...mockTerraformBackend,
        containerName: "legacy-core-state",
      },
    },
    {
      expectedUpstream: undefined,
      name: "the same own and core container",
      upstreamBackend: mockTerraformBackend,
    },
    {
      expectedUpstream:
        '"/subscriptions/core-subscription/resourceGroups/core-rg/providers/Microsoft.Storage/storageAccounts/corestorage/blobServices/default/containers/core-state" = {',
      name: "a core container in another storage account",
      upstreamBackend: {
        ...mockTerraformBackend,
        containerName: "core-state",
        resourceGroupName: "core-rg",
        storageAccountName: "corestorage",
        subscriptionId: "core-subscription",
      },
    },
  ])(
    "handles $name",
    async ({
      backendFile = "infra/core/dev/providers.tf",
      expectedUpstream,
      upstreamBackend,
    }) => {
      await withGeneratedEnvironment(
        {
          files: {
            [backendFile]: backendHcl({
              ...upstreamBackend,
              key: "legacy/core.tfstate",
            }),
          },
        },
        async (tmpDir) => {
          const main = await fs.readFile(
            path.join(tmpDir, "infra/bootstrapper/dev/main.tf"),
            "utf8",
          );

          const hasUpstream = Boolean(expectedUpstream);
          expect(main.includes(expectedUpstream ?? "upstream = {")).toBe(
            hasUpstream,
          );
          expect(main.includes('identities = ["infra_ci", "infra_cd"]')).toBe(
            hasUpstream,
          );
          await expect(
            fs.stat(path.join(tmpDir, "infra/core/dev/main.tf")),
          ).rejects.toThrow();
        },
      );
    },
  );
});

describe("environment generator — tenant-qualified bootstrap configuration", () => {
  it.each([
    { name: "ced-prod", prefix: "ced" },
    { name: "cgn-dev", prefix: "cgn" },
  ] as const)(
    "enables prefixing and keeps $name runner labels in both Azure branches",
    async ({ name, prefix }) => {
      const tenantPayload: Payload = {
        ...payload,
        env: {
          ...payload.env,
          cloudAccounts: azureAccounts,
          name,
          prefix,
        },
      };
      await withGeneratedEnvironment(
        {
          payload: tenantPayload,
        },
        async (tmpDir) => {
          const bootstrapperFile = await fs.readFile(
            path.join(tmpDir, `infra/bootstrapper/${name}/main.tf`),
            "utf8",
          );

          expect(bootstrapperFile).not.toContain(`name = "${name}"`);
          expect([
            ...bootstrapperFile.matchAll(
              new RegExp(`labels = \\[\\s*"${name}"\\s*\\]`, "g"),
            ),
          ]).toHaveLength(2);
          expect([
            ...bootstrapperFile.matchAll(
              /github_environment_prefix_enabled = true/g,
            ),
          ]).toHaveLength(2);
          expect([
            ...bootstrapperFile.matchAll(/version = "~> 7\.2"/g),
          ]).toHaveLength(2);
          expect([
            ...bootstrapperFile.matchAll(
              /container_name = "payments-tf-state"/g,
            ),
          ]).toHaveLength(2);
        },
      );
    },
  );

  it("rejects tenant names that do not match the selected prefix before actions run", () => {
    const mismatchPayload: Payload = {
      ...payload,
      env: {
        ...payload.env,
        name: "cgn-prod",
      },
    };
    const actions = getActions(resolveTemplatesPath("environment"));

    expect(() => actions(mismatchPayload)).toThrow(
      'Environment "cgn-prod" must be "dx-prod" to match prefix "dx".',
    );
  });
});

describe("environment generator — file generation (with init)", () => {
  let tmpDir: string;
  let originalCwd: string;

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
      CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
      ManagementTeam: "Engineering",
      Owner: "DX Platform",
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
    ).toHaveBeenCalledWith(
      cloudAccount,
      payload.env,
      payload.workspace.domain,
      payload.tags,
    );
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

describe("environment generator — tenant-qualified environment", () => {
  let tmpDir: string;
  let originalCwd: string;

  const payload: Payload = {
    env: {
      cloudAccounts: [
        {
          csp: "azure",
          defaultLocation: "italynorth",
          displayName: "PROD-CED",
          id: "sub-ced-123",
        },
      ],
      name: "ced-prod",
      prefix: "ced",
    },
    github: {
      owner: "pagopa",
      repo: "my-project",
    },
    runnerAppCredentials: {
      clientId: "test-app-client-id",
      id: "test-app-id",
      installationId: "test-installation-id",
      key: "test-private-key",
    },
    tags: {
      CostCenter: "TS330 - PDND & INTEROPERABILITA'",
      Owner: "DX Platform",
    },
    workspace: {
      domain: "bonus",
    },
  };

  beforeAll(async () => {
    ({ originalCwd, tmpDir } = await runEnvironmentGenerator({
      mockCloudAccountService: createMockCloudAccountService(
        mockTerraformBackend,
        true,
      ),
      mockGitHubService: createMockGitHubService(),
      payload,
      prepareRepository: async (repositoryRoot) => {
        await fs.copyFile(
          path.join(resolveTemplatesPath("monorepo"), "nx.json"),
          path.join(repositoryRoot, "nx.json"),
        );
      },
      tmpDirPrefix: "dx-cli-env-tenant-test-",
    }));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tmpDir);
  });

  it("registers the environment in the Nx Terraform plugin additional environments", async () => {
    const nxJson = JSON.parse(
      await fs.readFile(path.join(tmpDir, "nx.json"), "utf8"),
    ) as {
      plugins: {
        options?: { additionalEnvironments?: string[] };
        plugin: string;
      }[];
    };

    expect(
      nxJson.plugins.find((entry) => entry.plugin === "@pagopa/nx-terraform")
        ?.options?.additionalEnvironments,
    ).toEqual(["ced-prod"]);
  });
});
