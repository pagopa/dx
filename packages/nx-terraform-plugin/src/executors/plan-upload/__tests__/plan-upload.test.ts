import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanUploadExecutorSchema } from "../schema.ts";

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

import executor from "../plan-upload.ts";

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

describe("Plan Upload Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches terraformPlanUpload with the project root as module path", async () => {
    const options: PlanUploadExecutorSchema = {
      projectRoot: "infra/resources/dev",
      refresh: true,
      report: true,
      verbose: false,
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(dispatcherMocks.createDefaultTaskDispatcher).toHaveBeenCalledTimes(
      1,
    );
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith(
      "terraformPlanUpload",
      {
        modulePath: "infra/resources/dev",
        refresh: true,
        report: true,
        verbose: false,
      },
    );
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith(["plan-upload"]);
  });

  it("applies default options when only projectRoot is provided", async () => {
    const options = {
      projectRoot: "infra/resources/dev",
    } satisfies Partial<PlanUploadExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith(
      "terraformPlanUpload",
      {
        modulePath: "infra/resources/dev",
        refresh: true,
        report: false,
        verbose: false,
      },
    );
  });

  it("fails when projectRoot is missing", async () => {
    const options = {} satisfies Partial<PlanUploadExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(false);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Invalid plan-upload options",
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["projectRoot"],
          }),
        ]),
        path: "plan-upload options",
      }),
    );
    expect(dispatcherMocks.dispatchTask).not.toHaveBeenCalled();
  });
});
