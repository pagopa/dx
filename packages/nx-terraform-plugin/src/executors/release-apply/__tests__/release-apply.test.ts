import { ExecutorContext } from "@nx/devkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("dispatches terraformApply with the project root as module path", async () => {
    const options: ReleaseApplyExecutorSchema = {
      dryRun: false,
      projectRoot: "infra/resources/prod",
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
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledWith(
      "terraformApply",
      {
        modulePath: "infra/resources/prod",
        report: true,
        sensitiveKeys: ["hidden-link"],
        verbose: false,
      },
    );
    expect(loggerMocks.getPackageLogger).toHaveBeenCalledWith([
      "release-apply",
    ]);
  });

  it("does not dispatch terraformApply when the executor is a dry run", async () => {
    const options: ReleaseApplyExecutorSchema = {
      dryRun: true,
      projectRoot: "infra/resources/prod",
      report: false,
      sensitiveKeys: [],
      verbose: false,
    };

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(dispatcherMocks.createDefaultTaskDispatcher).not.toHaveBeenCalled();
    expect(dispatcherMocks.dispatchTask).not.toHaveBeenCalled();
    expect(loggerMocks.info).toHaveBeenCalledWith(
      "Skipping Terraform apply during release dry run",
      {
        projectRoot: "infra/resources/prod",
      },
    );
  });

  it("does not dispatch terraformApply when Nx sets dry-run mode", async () => {
    vi.stubEnv("NX_DRY_RUN", "true");
    const options = {
      projectRoot: "infra/resources/prod",
    } satisfies Partial<ReleaseApplyExecutorSchema>;

    const output = await executor(options, baseContext);

    expect(output.success).toBe(true);
    expect(dispatcherMocks.createDefaultTaskDispatcher).not.toHaveBeenCalled();
    expect(dispatcherMocks.dispatchTask).not.toHaveBeenCalled();
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
        sensitiveKeys: [],
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
