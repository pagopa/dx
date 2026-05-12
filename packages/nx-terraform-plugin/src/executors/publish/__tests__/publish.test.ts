import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NxReleasePublishExecutorSchema } from "../schema.ts";

const loggerMocks = vi.hoisted(() => {
  const info = vi.fn();
  const warn = vi.fn();
  return {
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

describe("Publish Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      version: "1.2.3",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(true);
    expect(publisherMocks.publishToGithub).toHaveBeenCalledWith({
      description: "Terraform module description",
      githubOwner: "pagopa-dx",
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
