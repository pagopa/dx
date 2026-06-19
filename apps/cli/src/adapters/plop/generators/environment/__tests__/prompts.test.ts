// Tests for workspaceSchema transforms (lowercase and trim on domain).
import inquirer from "inquirer";
import { describe, expect, it, vi } from "vitest";

import type {
  CloudAccount,
  CloudAccountRepository,
  CloudAccountService,
} from "../../../../../domain/cloud-account.js";
import type { EnvironmentInitStatus } from "../../../../../domain/environment.js";

import prompts, {
  formatInitializationDetails,
  type InitialAnswers,
  workspaceSchema,
} from "../prompts.js";

describe("workspaceSchema — domain transforms", () => {
  it("lowercases an uppercase domain", () => {
    const result = workspaceSchema.safeParse({ domain: "API" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("lowercases a mixed-case domain", () => {
    const result = workspaceSchema.safeParse({ domain: "MyDomain" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("mydomain");
  });

  it("trims leading and trailing whitespace from domain", () => {
    const result = workspaceSchema.safeParse({ domain: " aPi " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("requires domain to be provided", () => {
    const result = workspaceSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects domains that would create nested paths", () => {
    const result = workspaceSchema.safeParse({ domain: "core/platform" });

    expect(result.success).toBe(false);
  });
});

describe("formatInitializationDetails", () => {
  const account = (overrides: Partial<CloudAccount> = {}): CloudAccount => ({
    csp: "azure",
    defaultLocation: "italynorth",
    displayName: "DEV-FooBar",
    id: "sub-123",
    ...overrides,
  });

  const notInitializedStatus = (
    issues: (EnvironmentInitStatus & { initialized: false })["issues"],
  ): EnvironmentInitStatus & { initialized: false } => ({
    initialized: false,
    issues,
  });

  it("lists each uninitialized cloud account by displayName", () => {
    const status = notInitializedStatus([
      {
        cloudAccount: account({ displayName: "DEV-A" }),
        type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
      },
      {
        cloudAccount: account({ displayName: "DEV-B" }),
        type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
      },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).toContain('Azure subscription "DEV-A"');
    expect(output).toContain('Azure subscription "DEV-B"');
    expect(output).toContain("managed identity");
    expect(output).toContain("OIDC");
    expect(output).toContain("ARM_CLIENT_ID");
    expect(output).toContain("ARM_SUBSCRIPTION_ID");
    expect(output).not.toContain("ARM_TENANT_ID");
    expect(output).toContain("Key Vault");
  });

  it("includes the Terraform backend section when MISSING_REMOTE_BACKEND issue is present", () => {
    const status = notInitializedStatus([
      { cloudAccount: account(), type: "CLOUD_ACCOUNT_NOT_INITIALIZED" },
      { type: "MISSING_REMOTE_BACKEND" },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).toContain("Terraform remote backend");
    expect(output).toContain("Storage Account");
  });

  it("omits the Terraform backend section when no MISSING_REMOTE_BACKEND issue is present", () => {
    const status = notInitializedStatus([
      { cloudAccount: account(), type: "CLOUD_ACCOUNT_NOT_INITIALIZED" },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).not.toContain("Terraform remote backend");
  });

  it("omits the cloud account section when no CLOUD_ACCOUNT_NOT_INITIALIZED issues are present", () => {
    const status = notInitializedStatus([{ type: "MISSING_REMOTE_BACKEND" }]);

    const output = formatInitializationDetails(status);

    expect(output).not.toContain("Azure subscription");
    expect(output).toContain("Terraform remote backend");
  });

  it("returns an empty string when there are no relevant issues", () => {
    const status = notInitializedStatus([]);

    expect(formatInitializationDetails(status)).toBe("");
  });
});

describe("prompts with prefilled answers", () => {
  it("uses prefilled base answers without prompting again", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };

    const cloudAccountRepository: CloudAccountRepository = {
      list: vi.fn().mockResolvedValue([cloudAccount]),
    };

    const cloudAccountService: CloudAccountService = {
      getTerraformBackend: vi.fn().mockResolvedValue({
        resourceGroupName: "rg-test",
        storageAccountName: "sttest",
        subscriptionId: cloudAccount.id,
        type: "azurerm",
      }),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(true),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
    };

    const promptSpy = vi.spyOn(inquirer, "prompt");
    const locations = {
      "sub-123": "italynorth",
    } satisfies Record<string, "italynorth" | "westeurope">;

    promptSpy
      .mockResolvedValueOnce({
        env: {
          cloudAccounts: [cloudAccount],
          name: "dev",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          CostCenter: "TS000",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      })
      .mockResolvedValueOnce({
        [cloudAccount.id]: "italynorth",
      });

    try {
      const initialAnswers = {
        env: {
          cloudAccountIds: [cloudAccount.id],
          locations,
          name: "dev",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      } satisfies InitialAnswers;

      const deps = {
        cloudAccountRepository,
        cloudAccountService,
        github: {
          owner: "pagopa",
          repo: "dx",
        },
        initialAnswers,
      };

      const result = await prompts(deps)(inquirer);

      expect(promptSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        env: {
          cloudAccounts: [cloudAccount],
          name: "dev",
          prefix: "dx",
        },
        github: {
          owner: "pagopa",
          repo: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          CostCenter: "TS000",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      });
    } finally {
      promptSpy.mockRestore();
    }
  });
});

describe("prompts", () => {
  it("does not prompt again when only a single-account backend must be initialized", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };

    const cloudAccountRepository: CloudAccountRepository = {
      list: vi.fn().mockResolvedValue([cloudAccount]),
    };

    const cloudAccountService: CloudAccountService = {
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(true),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
    };

    const promptSpy = vi.spyOn(inquirer, "prompt");
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    promptSpy
      .mockResolvedValueOnce({
        env: {
          cloudAccounts: [cloudAccount],
          name: "dev",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          CostCenter: "TS000",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      })
      .mockResolvedValueOnce({
        [cloudAccount.id]: "italynorth",
      })
      .mockResolvedValueOnce({
        init: true,
      })
      .mockResolvedValueOnce({});

    try {
      const result = await prompts({
        cloudAccountRepository,
        cloudAccountService,
        github: {
          owner: "pagopa",
          repo: "dx",
        },
      })(inquirer);

      expect(promptSpy).toHaveBeenCalledTimes(3);
      expect(result.init?.terraformBackend).toEqual({
        cloudAccount,
      });
    } finally {
      promptSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }
  });

  it("prompts for the GitHub runner app client ID when initialization is required", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };

    const cloudAccountRepository: CloudAccountRepository = {
      list: vi.fn().mockResolvedValue([cloudAccount]),
    };

    const cloudAccountService: CloudAccountService = {
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
    };

    const promptSpy = vi.spyOn(inquirer, "prompt");
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    promptSpy
      .mockResolvedValueOnce({
        env: {
          cloudAccounts: [cloudAccount],
          name: "dev",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          CostCenter: "TS000",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      })
      .mockResolvedValueOnce({
        [cloudAccount.id]: "italynorth",
      })
      .mockResolvedValueOnce({
        init: true,
      })
      .mockResolvedValueOnce({
        runnerAppCredentials: {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
        },
      });

    try {
      const result = await prompts({
        cloudAccountRepository,
        cloudAccountService,
        github: {
          owner: "pagopa",
          repo: "dx",
        },
      })(inquirer);

      const runnerCredentialQuestions = promptSpy.mock.calls[3]?.[0];

      expect(runnerCredentialQuestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "GitHub Runner App ID",
            name: "runnerAppCredentials.id",
          }),
          expect.objectContaining({
            message: "GitHub Runner App Client ID",
            name: "runnerAppCredentials.clientId",
          }),
          expect.objectContaining({
            message: "GitHub Runner App Installation ID",
            name: "runnerAppCredentials.installationId",
          }),
          expect.objectContaining({
            message: "GitHub Runner App Private Key",
            name: "runnerAppCredentials.key",
          }),
        ]),
      );

      expect(result.init?.runnerAppCredentials).toEqual({
        clientId: "app-client-id",
        id: "app-id",
        installationId: "installation-id",
        key: "private-key",
      });
    } finally {
      promptSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }
  });

  it("blocks initialization when the permission preflight is negative", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "UAT-FooBar",
      id: "sub-123",
    };

    const cloudAccountService: CloudAccountService = {
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(false),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
    };

    const promptSpy = vi.spyOn(inquirer, "prompt");
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    promptSpy
      .mockResolvedValueOnce({
        env: {
          cloudAccounts: [cloudAccount],
          name: "uat",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          CostCenter: "TS000",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      })
      .mockResolvedValueOnce({
        [cloudAccount.id]: "italynorth",
      })
      .mockResolvedValueOnce({
        init: true,
      });

    try {
      await expect(
        prompts({
          cloudAccountRepository: {
            list: vi.fn().mockResolvedValue([cloudAccount]),
          },
          cloudAccountService,
          github: {
            owner: "pagopa",
            repo: "dx",
          },
        })(inquirer),
      ).rejects.toThrow(
        "You don't have permission to initialize this environment",
      );
      expect(
        cloudAccountService.hasUserPermissionToInitialize,
      ).toHaveBeenCalledWith(cloudAccount.id);
    } finally {
      promptSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }
  });
});

describe("prompts with prefilled initialization answers", () => {
  it("skips initialization prompts when confirmation and runner credentials are prefilled", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };

    const cloudAccountRepository: CloudAccountRepository = {
      list: vi.fn().mockResolvedValue([cloudAccount]),
    };

    const cloudAccountService: CloudAccountService = {
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
    };

    const promptSpy = vi.spyOn(inquirer, "prompt");
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    promptSpy
      .mockResolvedValueOnce({
        init: true,
      })
      .mockResolvedValueOnce({
        runnerAppCredentials: {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
        },
      });

    try {
      const locations = {
        [cloudAccount.id]: "italynorth",
      } satisfies Record<string, "italynorth" | "westeurope">;

      const initialAnswers = {
        env: {
          cloudAccountIds: [cloudAccount.id],
          locations,
          name: "dev",
          prefix: "dx",
        },
        init: {
          confirm: true,
          runnerAppCredentials: {
            clientId: "app-client-id",
            id: "app-id",
            installationId: "installation-id",
            key: "private-key",
          },
        },
        tags: {
          BusinessUnit: "Platform",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      } satisfies InitialAnswers;

      const result = await prompts({
        cloudAccountRepository,
        cloudAccountService,
        github: {
          owner: "pagopa",
          repo: "dx",
        },
        initialAnswers,
      })(inquirer);

      expect(promptSpy).not.toHaveBeenCalled();
      expect(result.init).toEqual({
        cloudAccountsToInitialize: [cloudAccount],
        runnerAppCredentials: {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
        },
        terraformBackend: {
          cloudAccount,
        },
      });
    } finally {
      promptSpy.mockRestore();
      consoleLogSpy.mockRestore();
    }
  });
});
