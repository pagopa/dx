import { ExecutorContext } from "@nx/devkit";
import { describe, expect, it, vi } from "vitest";

import type { NxReleasePublishExecutorSchema } from "./schema.d.ts";

const loggerMocks = vi.hoisted(() => {
  const info = vi.fn();
  return {
    configurePackageLogger: vi.fn(async () => {}),
    getPackageLogger: vi.fn(() => ({
      info,
    })),
    info,
  };
});

vi.mock("../../logger.ts", () => ({
  configurePackageLogger: loggerMocks.configurePackageLogger,
  getPackageLogger: loggerMocks.getPackageLogger,
}));

import executor, { getRepoNameFromProjectRoot } from "./publish.ts";

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
  it("derives a repo name from project root", () => {
    expect(
      getRepoNameFromProjectRoot("infra/modules/azure_core_infra", "azurerm"),
    ).toBe("terraform-azurerm-azure-core-infra");
  });

  it("runs successfully when projectRoot is provided", async () => {
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
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
    expect(loggerMocks.configurePackageLogger).toHaveBeenCalledWith();
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
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      provider: "aws",
      version: "1.2.3",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });

  it("fails when provider is missing", async () => {
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      projectRoot: "infra/modules/azure_core_infra",
      version: "1.2.3",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });

  it("fails when description is missing", async () => {
    const options: NxReleasePublishExecutorSchema = {
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      version: "1.2.3",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });

  it("fails when version is missing", async () => {
    const options: NxReleasePublishExecutorSchema = {
      description: "Terraform module description",
      projectRoot: "infra/modules/azure_core_infra",
      provider: "aws",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });
});
