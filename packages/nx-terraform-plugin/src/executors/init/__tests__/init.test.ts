/**
 * Verifies the Nx adapter for the shared Terraform initialization task.
 */

import { ExecutorContext } from "@nx/devkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => {
  const error = vi.fn();
  return {
    configureLogger: vi.fn(async () => {}),
    error,
    getPackageLogger: vi.fn(() => ({
      error,
    })),
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

import executor from "../init.ts";

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

describe("Init Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches terraformInit with parsed options", async () => {
    const output = await executor(
      {
        args: ["-backend=false"],
        frozenLockfile: true,
        projectRoot: "infra/example",
      },
      baseContext,
    );

    expect(output.success).toBe(true);
    expect(
      dispatcherMocks.createDefaultTaskDispatcher,
    ).toHaveBeenCalledExactlyOnceWith();
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledExactlyOnceWith(
      "terraformInit",
      {
        args: ["-backend=false"],
        frozenLockfile: true,
        modulePath: "infra/example",
      },
    );
  });

  it("applies init defaults before dispatching", async () => {
    const output = await executor(
      {
        projectRoot: "infra/example",
      },
      baseContext,
    );

    expect(output.success).toBe(true);
    expect(dispatcherMocks.dispatchTask).toHaveBeenCalledExactlyOnceWith(
      "terraformInit",
      {
        args: [],
        frozenLockfile: false,
        modulePath: "infra/example",
      },
    );
  });

  it("fails validation before creating the dispatcher", async () => {
    const output = await executor({ projectRoot: "" }, baseContext);

    expect(output.success).toBe(false);
    expect(dispatcherMocks.createDefaultTaskDispatcher).not.toHaveBeenCalled();
    expect(loggerMocks.error).toHaveBeenCalledWith(
      "Invalid init options",
      expect.objectContaining({
        path: "",
      }),
    );
  });
});
