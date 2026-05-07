import { ExecutorContext } from "@nx/devkit";
import { describe, expect, it } from "vitest";

import type { NxReleasePublishExecutorSchema } from "./schema.d.ts";

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
      projectRoot: "infra/modules/azure_core_infra",
      workspaceRoot: "/repo",
    };
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(true);
  });

  it("fails when projectRoot is missing", async () => {
    const options: NxReleasePublishExecutorSchema = {};
    const context: ExecutorContext = {
      ...baseContext,
    };

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });
});
