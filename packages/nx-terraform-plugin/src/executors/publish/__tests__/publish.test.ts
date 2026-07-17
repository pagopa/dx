import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NxReleasePublishExecutorSchema } from "../schema.ts";

const loggerMocks = vi.hoisted(() => {
  const configureLogger = vi.fn(async () => {});
  const info = vi.fn();
  const warn = vi.fn();
  return {
    configureLogger,
    getPackageLogger: vi.fn(() => ({
      info,
      warn,
    })),
    info,
    warn,
  };
});

const publisherMocks = vi.hoisted(() => ({
  publishToGithub: vi.fn(),
}));

vi.mock("../../../logger.ts", () => ({
  configureLogger: loggerMocks.configureLogger,
  getPackageLogger: loggerMocks.getPackageLogger,
}));

vi.mock("../../../adapters/github/publisher.ts", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../adapters/github/publisher.ts")
    >();
  return {
    ...actual,
    publishToGithub: publisherMocks.publishToGithub,
  };
});

import executor, { getRepoNameFromProjectRoot } from "../publish.ts";

const baseContext: ExecutorContext = {
  cwd: process.cwd(),
  isVerbose: false,
  nxJsonConfiguration: {},
  projectGraph: {
    dependencies: {},
    nodes: {},
  },
  projectsConfigurations: {
    projects: {},
    version: 2,
  },
  root: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GH_APP_CLIENT_ID", "Iv23.client-id");
  vi.stubEnv("GH_APP_KEY", "private-key\\nsecond-line");
  vi.stubEnv("GH_TOKEN", "legacy-token");
});

describe("Publish Executor", () => {
  it("derives a repo name from project root", () => {
    expect(
      getRepoNameFromProjectRoot("infra/modules/azure_core_infra", "azurerm"),
    ).toBe("terraform-azurerm-azure-core-infra");
  });

  it("runs successfully when projectRoot is provided", async () => {
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      useGitHubAppAuthentication: true,
      version: "1.2.3",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(true);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(publisherMocks.publishToGithub).toHaveBeenCalledWith({
      description: "Terraform module description",
      githubAppCredentials: {
        clientId: "Iv23.client-id",
        privateKey: "private-key\nsecond-line",
      },
      githubOwner: "pagopa-dx",
      githubToken: "",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    });
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith(["publish"]);
    expect(loggerMocks.info).toHaveBeenCalledWith(
      "Publishing Terraform module from {projectRoot} to repository {repoName}...",
      {
        projectRoot: "infra/modules/azure_core_infra",
        repoName: "terraform-aws-azure-core-infra",
      },
    );
  });
});

describe("Publish Executor authentication", () => {
  it("fails when GitHub App credentials are missing", async () => {
    vi.stubEnv("GH_APP_CLIENT_ID", "");
    vi.stubEnv("GH_APP_KEY", "");
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      useGitHubAppAuthentication: true,
      version: "1.2.3",
      workspaceRoot: "/repo",
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(false);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Invalid GitHub authentication environment",
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["environment", "GH_APP_CLIENT_ID"],
          }),
          expect.objectContaining({ path: ["environment", "GH_APP_KEY"] }),
        ]),
      }),
    );
    expect(publisherMocks.publishToGithub).not.toHaveBeenCalled();
  });

  it("uses GH_TOKEN when the owner is not configured in nx.json", async () => {
    vi.stubEnv("GH_APP_CLIENT_ID", "");
    vi.stubEnv("GH_APP_KEY", "");
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      githubOwner: "manifest-owner",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      useGitHubAppAuthentication: false,
      version: "1.2.3",
      workspaceRoot: "/repo",
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(publisherMocks.publishToGithub).toHaveBeenCalledWith(
      expect.objectContaining({
        githubOwner: "manifest-owner",
        githubToken: "legacy-token",
      }),
    );
  });

  it("falls back to GITHUB_TOKEN when GH_TOKEN is not set", async () => {
    vi.stubEnv("GH_TOKEN", undefined);
    vi.stubEnv("GITHUB_TOKEN", "github-token");
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      githubOwner: "manifest-owner",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      useGitHubAppAuthentication: false,
      version: "1.2.3",
      workspaceRoot: "/repo",
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(publisherMocks.publishToGithub).toHaveBeenCalledWith(
      expect.objectContaining({ githubToken: "github-token" }),
    );
  });
});

describe("Publish Executor validation", () => {
  it('logs "Skipping release, tag already exists" when publish is skipped', async () => {
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    publisherMocks.publishToGithub.mockResolvedValue("skipped");

    const output = await executor(options, context);

    expect(output.success).toBe(true);
    expect(loggerMocks.info).toHaveBeenNthCalledWith(
      2,
      "Skipping release, tag already exists",
    );
  });

  it("fails when projectRoot is missing", async () => {
    const options = {
      description: "Terraform module description",
      provider: "aws",
      version: "1.2.3",
    } satisfies Partial<NxReleasePublishExecutorSchema>;
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Invalid publish options",
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["githubOwner"],
          }),
          expect.objectContaining({
            path: ["projectRoot"],
          }),
          expect.objectContaining({
            path: ["workspaceRoot"],
          }),
        ]),
        path: "publish options",
      }),
    );
    expect(publisherMocks.publishToGithub).not.toHaveBeenCalled();
  });

  it("fails when provider is missing", async () => {
    const options = {
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      version: "1.2.3",
      workspaceRoot: "/repo",
    } satisfies Partial<NxReleasePublishExecutorSchema>;
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });

  it("fails when description is missing", async () => {
    const options = {
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    } satisfies Partial<NxReleasePublishExecutorSchema>;
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });

  it("fails when version is missing", async () => {
    const options = {
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      workspaceRoot: "/repo",
    } satisfies Partial<NxReleasePublishExecutorSchema>;
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });
});
