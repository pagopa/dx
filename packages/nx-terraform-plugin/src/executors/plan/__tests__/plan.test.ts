import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanExecutorSchema } from "../schema.ts";

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

const dispatcherMocks = vi.hoisted(() => {
  const dispatchTask = vi.fn(async () => {});
  return {
    createDefaultTaskDispatcher: vi.fn(() => ({
      dispatchTask,
      registerTask: vi.fn(),
    })),
    dispatchTask,
  };
});

vi.mock("../../../logger.ts", () => ({
  configureLogger: loggerMocks.configureLogger,
  getPackageLogger: loggerMocks.getPackageLogger,
}));

vi.mock("@pagopa/dx-tasks/default-dispatcher", () => ({
  createDefaultTaskDispatcher: dispatcherMocks.createDefaultTaskDispatcher,
}));

import executor from "../plan.ts";

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

describe("Plan Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches terraformPlan with the project root as module path", async () => {
    const options: PlanExecutorSchema = {
      out: "plan.tfplan",
      projectRoot: "infra/modules/azure_core_infra",
      refresh: true,
      report: true,
      sensitiveKeys: ["hidden-link"],
      verbose: false,
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(dispatcherMocks.createDefaultTaskDispatcher).toHaveBeenCalledTimes(
      1,
    );
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith("terraformPlan", {
      modulePath: "infra/modules/azure_core_infra",
      out: "plan.tfplan",
      refresh: true,
      report: true,
      sensitiveKeys: ["hidden-link"],
      verbose: false,
    });
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith(["plan"]);
  });

  it("applies default options when only projectRoot is provided", async () => {
    const options = {
      projectRoot: "infra/modules/azure_core_infra",
    } satisfies Partial<PlanExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith("terraformPlan", {
      modulePath: "infra/modules/azure_core_infra",
      out: undefined,
      refresh: true,
      report: false,
      sensitiveKeys: [],
      verbose: false,
    });
  });

  it("fails when projectRoot is missing", async () => {
    const options = {} satisfies Partial<PlanExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(false);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Invalid plan options",
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["projectRoot"],
          }),
        ]),
        path: "plan options",
      }),
    );
    expect(dispatcherMocks.dispatchTask).not.toHaveBeenCalled();
  });
});
