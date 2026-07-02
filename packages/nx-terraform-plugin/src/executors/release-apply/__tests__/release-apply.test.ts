import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReleaseApplyExecutorSchema } from "../schema.ts";

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

import executor from "../release-apply.ts";

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

describe("Release Apply Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches terraformApply with the project root as module path", async () => {
    const options: ReleaseApplyExecutorSchema = {
      projectRoot: "infra/resources/prod",
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
      "terraformApply",
      {
        modulePath: "infra/resources/prod",
        report: true,
        verbose: false,
      },
    );
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith([
      "release-apply",
    ]);
  });

  it("applies default options when only projectRoot is provided", async () => {
    const options = {
      projectRoot: "infra/resources/prod",
    } satisfies Partial<ReleaseApplyExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith(
      "terraformApply",
      {
        modulePath: "infra/resources/prod",
        report: false,
        verbose: false,
      },
    );
  });

  it("fails when projectRoot is missing", async () => {
    const options = {} satisfies Partial<ReleaseApplyExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(false);
    expect(loggerMocks.configureLogger).toHaveBeenCalledTimes(1);
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      "Invalid release-apply options",
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["projectRoot"],
          }),
        ]),
        path: "release-apply options",
      }),
    );
    expect(dispatcherMocks.dispatchTask).not.toHaveBeenCalled();
  });
});
