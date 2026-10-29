// Tests for workspaceSchema transforms (lowercase and trim on domain).
import inquirer from "inquirer";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  CloudAccount,
  CloudAccountRepository,
  CloudAccountService,
  RunnerAppCredentialsLookup,
} from "../../../../../domain/cloud-account.js";
import type { EnvironmentInitStatus } from "../../../../../domain/environment.js";

import prompts, {
  costCenterValues,
  formatInitializationDetails,
  type InitialAnswers,
  type PromptsDependencies,
  workspaceSchema,
} from "../prompts.js";

const account: CloudAccount = {
  csp: "azure",
  defaultLocation: "italynorth",
  displayName: "DEV-Test",
  id: "sub-123",
};
const credentials = {
  clientId: "client-id",
  id: "app-id",
  installationId: "installation-id",
  key: "private-key",
};
const initialAnswers: InitialAnswers = {
  env: {
    cloudAccountIds: [account.id],
    locations: { [account.id]: "italynorth" },
    name: "dev",
    prefix: "dx",
  },
  tags: {
    BusinessUnit: "DX",
    CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
    ManagementTeam: "DX",
    Owner: "DX",
  },
  workspace: { domain: "playground" },
};
const createDependencies = (lookup: RunnerAppCredentialsLookup) => {
  const cloudAccountService = {
    configureGitHubEnvironment: vi.fn(),
    getRunnerAppCredentials: vi.fn().mockResolvedValue(lookup),
    getTerraformBackend: vi.fn().mockResolvedValue({
      resourceGroupName: "rg",
      storageAccountName: "storage",
      subscriptionId: account.id,
      type: "azurerm",
    }),
    hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
    initialize: vi.fn(),
    isInitialized: vi.fn().mockResolvedValue(true),
    provisionTerraformBackend: vi.fn(),
    storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
  };
  return {
    cloudAccountRepository: { list: vi.fn().mockResolvedValue([account]) },
    cloudAccountService,
    github: { owner: "pagopa", repo: "dx-playground" },
    initialAnswers,
  };
};

describe("reusing Runner App credentials", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    "automatically reuses the vault credentials with nonInteractive=%s",
    async (nonInteractive) => {
      const deps = createDependencies({ credentials, missingClientId: false });
      const promptSpy = vi.spyOn(inquirer, "prompt");

      const result = await prompts({ ...deps, nonInteractive })(inquirer);

      expect(result.runnerAppCredentials).toEqual(credentials);
      expect(promptSpy).not.toHaveBeenCalled();
      expect(
        deps.cloudAccountService.getRunnerAppCredentials,
      ).toHaveBeenCalledWith(
        account,
        expect.objectContaining({ name: "dev", prefix: "dx" }),
      );
      expect(
        deps.cloudAccountService.storeRunnerAppClientId,
      ).not.toHaveBeenCalled();
    },
  );

  it("asks only for a legacy vault's missing client ID and saves it", async () => {
    const deps = createDependencies({
      credentials: {
        id: credentials.id,
        installationId: credentials.installationId,
        key: credentials.key,
      },
      missingClientId: true,
    });
    const promptSpy = vi.spyOn(inquirer, "prompt").mockResolvedValue({
      runnerAppCredentials: { clientId: credentials.clientId },
    });

    const result = await prompts(deps)(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(promptSpy).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ name: "runnerAppCredentials.clientId" }),
    ]);
    expect(JSON.stringify(promptSpy.mock.calls)).not.toContain(credentials.key);
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).toHaveBeenCalledWith(
      account,
      expect.objectContaining({ name: "dev", prefix: "dx" }),
      credentials.clientId,
    );
  });

  it("uses an explicitly supplied client ID for a legacy vault in CI", async () => {
    const deps = createDependencies({
      credentials: {
        id: credentials.id,
        installationId: credentials.installationId,
        key: credentials.key,
      },
      missingClientId: true,
    });
    const promptSpy = vi.spyOn(inquirer, "prompt");

    const result = await prompts({
      ...deps,
      initialAnswers: {
        ...initialAnswers,
        init: { runnerAppCredentials: { clientId: credentials.clientId } },
      },
      nonInteractive: true,
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).toHaveBeenCalledExactlyOnceWith(
      account,
      expect.objectContaining({ name: "dev", prefix: "dx" }),
      credentials.clientId,
    );
  });

  it("reports the missing client ID in CI rather than prompting", async () => {
    const deps = createDependencies({
      credentials: {
        id: credentials.id,
        installationId: credentials.installationId,
        key: credentials.key,
      },
      missingClientId: true,
    });
    const promptSpy = vi.spyOn(inquirer, "prompt");

    await expect(
      prompts({ ...deps, nonInteractive: true })(inquirer),
    ).rejects.toThrow("Provide: --client-id.");
    expect(promptSpy).not.toHaveBeenCalled();
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).not.toHaveBeenCalled();
  });

  it("uses explicit credentials without looking in the vault", async () => {
    const deps = createDependencies({
      credentials: {},
      missingClientId: false,
    });

    const result = await prompts({
      ...deps,
      initialAnswers: {
        ...initialAnswers,
        init: { runnerAppCredentials: credentials },
      },
      nonInteractive: true,
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(
      deps.cloudAccountService.getRunnerAppCredentials,
    ).not.toHaveBeenCalled();
  });

  it("prompts for unavailable credentials without asking to confirm reuse", async () => {
    const deps = createDependencies({
      credentials: {},
      missingClientId: false,
    });
    const promptSpy = vi.spyOn(inquirer, "prompt").mockResolvedValue({
      runnerAppCredentials: credentials,
    });

    const result = await prompts(deps)(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(promptSpy).toHaveBeenCalledExactlyOnceWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "runnerAppCredentials.id" }),
        expect.objectContaining({ name: "runnerAppCredentials.clientId" }),
        expect.objectContaining({
          name: "runnerAppCredentials.installationId",
        }),
        expect.objectContaining({ name: "runnerAppCredentials.key" }),
      ]),
    );
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).not.toHaveBeenCalled();
  });

  it("reuses credentials when only the Terraform backend is missing", async () => {
    const deps = createDependencies({ credentials, missingClientId: false });
    deps.cloudAccountService.getTerraformBackend.mockResolvedValue(undefined);
    const promptSpy = vi.spyOn(inquirer, "prompt");
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const result = await prompts({
      ...deps,
      initialAnswers: { ...initialAnswers, init: { confirm: true } },
      nonInteractive: true,
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(result.init?.runnerAppCredentials).toEqual(credentials);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe("Runner App credential selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses explicit values over vault values without changing stored credentials", async () => {
    const deps = createDependencies({ credentials, missingClientId: false });

    const result = await prompts({
      ...deps,
      initialAnswers: {
        ...initialAnswers,
        init: {
          runnerAppCredentials: { clientId: "explicit-client-id" },
        },
      },
      nonInteractive: true,
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual({
      ...credentials,
      clientId: "explicit-client-id",
    });
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).not.toHaveBeenCalled();
  });

  it("does not backfill a client ID when the App ID is overridden", async () => {
    const deps = createDependencies({
      credentials: {
        id: credentials.id,
        installationId: credentials.installationId,
        key: credentials.key,
      },
      missingClientId: true,
    });

    const result = await prompts({
      ...deps,
      initialAnswers: {
        ...initialAnswers,
        init: {
          runnerAppCredentials: {
            clientId: "explicit-client-id",
            id: "different-app-id",
          },
        },
      },
      nonInteractive: true,
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual({
      ...credentials,
      clientId: "explicit-client-id",
      id: "different-app-id",
    });
    expect(
      deps.cloudAccountService.storeRunnerAppClientId,
    ).not.toHaveBeenCalled();
  });

  it("keeps credential input manual for multiple subscriptions", async () => {
    const deps = createDependencies({ credentials, missingClientId: false });
    const secondAccount: CloudAccount = {
      ...account,
      displayName: "DEV-Other",
      id: "sub-456",
    };
    deps.cloudAccountRepository.list.mockResolvedValue([
      account,
      secondAccount,
    ]);
    const promptSpy = vi.spyOn(inquirer, "prompt").mockResolvedValue({
      runnerAppCredentials: credentials,
    });

    const result = await prompts({
      ...deps,
      initialAnswers: {
        ...initialAnswers,
        env: {
          ...initialAnswers.env,
          cloudAccountIds: [account.id, secondAccount.id],
          locations: {
            [account.id]: "italynorth",
            [secondAccount.id]: "italynorth",
          },
        },
      },
    })(inquirer);

    expect(result.runnerAppCredentials).toEqual(credentials);
    expect(promptSpy).toHaveBeenCalledExactlyOnceWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "runnerAppCredentials.id" }),
        expect.objectContaining({ name: "runnerAppCredentials.clientId" }),
        expect.objectContaining({
          name: "runnerAppCredentials.installationId",
        }),
        expect.objectContaining({ name: "runnerAppCredentials.key" }),
      ]),
    );
    expect(
      deps.cloudAccountService.getRunnerAppCredentials,
    ).not.toHaveBeenCalled();
  });
});

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
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
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
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
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
          CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
          ManagementTeam: "Engineering",
          Owner: "DX Platform",
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
        init: {
          runnerAppCredentials: {
            clientId: "app-client-id",
            id: "app-id",
            installationId: "installation-id",
            key: "private-key",
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
        runnerAppCredentials: {
          clientId: "app-client-id",
          id: "app-id",
          installationId: "installation-id",
          key: "private-key",
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
      });
    } finally {
      promptSpy.mockRestore();
    }
  });
});

describe("required tag prompts", () => {
  it("prompts for validated required tags and omits skipped optional tags", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };
    const cloudAccountService: CloudAccountService = {
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
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
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
    };
    const promptSpy = vi.spyOn(inquirer, "prompt");
    promptSpy.mockResolvedValueOnce({
      tags: {
        BusinessUnit: " ",
        CostCenter: costCenterValues[8],
        ManagementTeam: "  ",
        Owner: "  DX Platform  ",
      },
    });

    try {
      const result = await prompts({
        cloudAccountRepository: {
          list: vi.fn().mockResolvedValue([cloudAccount]),
        },
        cloudAccountService,
        github: { owner: "pagopa", repo: "dx" },
        initialAnswers: {
          env: {
            cloudAccountIds: [cloudAccount.id],
            locations: { [cloudAccount.id]: "italynorth" },
            name: "dev",
            prefix: "dx",
          },
          init: {
            runnerAppCredentials: {
              clientId: "app-client-id",
              id: "app-id",
              installationId: "installation-id",
              key: "private-key",
            },
          },
          workspace: { domain: "payments" },
        },
      })(inquirer);

      expect(promptSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            choices: [...costCenterValues],
            default: costCenterValues[0],
            message:
              "Cost center (Pagopa only; if unsure, check https://pagopa.atlassian.net/wiki/search?text=tagging%20strategy)",
            name: "tags.CostCenter",
            type: "list",
          }),
          expect.objectContaining({
            message: "Owner",
            name: "tags.Owner",
            type: "input",
          }),
          expect.objectContaining({
            name: "tags.BusinessUnit",
          }),
          expect.objectContaining({
            name: "tags.ManagementTeam",
          }),
        ]),
      );
      expect(result.tags).toEqual({
        CostCenter: costCenterValues[8],
        Owner: "DX Platform",
      });
    } finally {
      promptSpy.mockRestore();
    }
  });
});

describe("non-interactive tag defaults", () => {
  it("uses the default cost center in non-interactive mode and requires an owner", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };
    const cloudAccountService: CloudAccountService = {
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
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
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
    };
    const promptSpy = vi.spyOn(inquirer, "prompt");
    const dependencies: PromptsDependencies = {
      cloudAccountRepository: {
        list: vi.fn().mockResolvedValue([cloudAccount]),
      },
      cloudAccountService,
      github: { owner: "pagopa", repo: "dx" },
      initialAnswers: {
        env: {
          cloudAccountIds: [cloudAccount.id],
          locations: { [cloudAccount.id]: "italynorth" },
          name: "dev",
          prefix: "dx",
        },
        init: {
          runnerAppCredentials: {
            clientId: "app-client-id",
            id: "app-id",
            installationId: "installation-id",
            key: "private-key",
          },
        },
        tags: { Owner: "DX Platform" },
        workspace: { domain: "payments" },
      },
      nonInteractive: true,
    };

    try {
      const result = await prompts(dependencies)(inquirer);

      expect(promptSpy).not.toHaveBeenCalled();
      expect(result.tags).toEqual({
        CostCenter: costCenterValues[0],
        Owner: "DX Platform",
      });
      await expect(
        prompts({
          ...dependencies,
          initialAnswers: {
            ...dependencies.initialAnswers,
            tags: undefined,
          },
        })(inquirer),
      ).rejects.toThrow(
        "Owner is required in non-interactive mode. Provide --owner <owner>.",
      );
      expect(promptSpy).not.toHaveBeenCalled();
    } finally {
      promptSpy.mockRestore();
    }
  });
});

// eslint-disable-next-line max-lines-per-function
describe("prompts", () => {
  it("prompts for Runner App credentials when the environment is already initialized", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };
    const promptSpy = vi.spyOn(inquirer, "prompt");

    promptSpy.mockResolvedValueOnce({
      runnerAppCredentials: {
        clientId: "app-client-id",
        installationId: "installation-id",
        key: "private-key",
      },
    });

    try {
      const result = await prompts({
        cloudAccountRepository: {
          list: vi.fn().mockResolvedValue([cloudAccount]),
        },
        cloudAccountService: {
          configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
          getRunnerAppCredentials: vi
            .fn()
            .mockResolvedValue({ credentials: {}, missingClientId: false }),
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
          storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
        },
        github: {
          owner: "pagopa",
          repo: "dx",
        },
        initialAnswers: {
          env: {
            cloudAccountIds: [cloudAccount.id],
            locations: { [cloudAccount.id]: "italynorth" },
            name: "dev",
            prefix: "dx",
          },
          init: {
            runnerAppCredentials: {
              id: "prefilled-app-id",
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
        },
      })(inquirer);

      expect(promptSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "runnerAppCredentials.clientId",
          }),
        ]),
      );
      expect(promptSpy.mock.calls[0]?.[0]).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "runnerAppCredentials.id",
          }),
        ]),
      );
      expect(result.runnerAppCredentials).toEqual({
        clientId: "app-client-id",
        id: "prefilled-app-id",
        installationId: "installation-id",
        key: "private-key",
      });
    } finally {
      promptSpy.mockRestore();
    }
  });

  it("fails in non-interactive mode when Runner App credentials are missing", async () => {
    const cloudAccount: CloudAccount = {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };
    const dependencies = {
      cloudAccountRepository: {
        list: vi.fn().mockResolvedValue([cloudAccount]),
      },
      cloudAccountService: {
        configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
        getRunnerAppCredentials: vi
          .fn()
          .mockResolvedValue({ credentials: {}, missingClientId: false }),
        getTerraformBackend: vi.fn().mockResolvedValue(undefined),
        hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        isInitialized: vi.fn().mockResolvedValue(true),
        provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
        storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
      },
      github: {
        owner: "pagopa",
        repo: "dx",
      },
      initialAnswers: {
        env: {
          cloudAccountIds: [cloudAccount.id],
          locations: { [cloudAccount.id]: "italynorth" },
          name: "dev",
          prefix: "dx",
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
      },
      nonInteractive: true,
    } as PromptsDependencies;

    await expect(prompts(dependencies)(inquirer)).rejects.toThrow(
      "GitHub Runner App credentials are required in non-interactive mode",
    );
  });

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
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(true),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
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
          CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
          ManagementTeam: "Engineering",
          Owner: "DX Platform",
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

      expect(promptSpy).toHaveBeenCalledTimes(4);
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
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
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
          CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
          ManagementTeam: "Engineering",
          Owner: "DX Platform",
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
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(false),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
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
          CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
          ManagementTeam: "Engineering",
          Owner: "DX Platform",
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
      configureGitHubEnvironment: vi.fn().mockResolvedValue(undefined),
      getRunnerAppCredentials: vi
        .fn()
        .mockResolvedValue({ credentials: {}, missingClientId: false }),
      getTerraformBackend: vi.fn().mockResolvedValue(undefined),
      hasUserPermissionToInitialize: vi.fn().mockResolvedValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      isInitialized: vi.fn().mockResolvedValue(false),
      provisionTerraformBackend: vi.fn().mockResolvedValue(undefined),
      storeRunnerAppClientId: vi.fn().mockResolvedValue(undefined),
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
          CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
          ManagementTeam: "Engineering",
          Owner: "DX Platform",
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
