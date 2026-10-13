/** Verifies Nx apply option validation and dispatch to the shared task. */

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatchTask: vi.fn(async () => {}),
  warn: vi.fn(),
}));
vi.mock("@pagopa/dx-tasks/default-dispatcher", () => ({
  createDefaultTaskDispatcher: () => ({ dispatchTask: mocks.dispatchTask }),
}));
vi.mock("../../../logger.ts", () => ({
  configureLogger: vi.fn(async () => {}),
  getPackageLogger: () => ({ warn: mocks.warn }),
}));

import executor from "../apply.ts";

const context = {
  cwd: "",
  isVerbose: false,
  nxJsonConfiguration: {},
  projectGraph: { dependencies: {}, nodes: {} },
  projectsConfigurations: { projects: {}, version: 2 },
  root: "",
};

describe("Apply Executor", () => {
  afterEach(() => vi.clearAllMocks());

  it("dispatches the project root and saved plan", async () => {
    await expect(
      executor(
        {
          planFile: "saved.tfplan",
          projectRoot: "infra/resources/prod",
        },
        context,
      ),
    ).resolves.toEqual({ success: true });
    expect(mocks.dispatchTask).toHaveBeenCalledWith("terraformApply", {
      modulePath: "infra/resources/prod",
      planFile: "saved.tfplan",
    });
  });

  it("reports invalid options without running Terraform", async () => {
    await expect(executor({}, context)).resolves.toEqual({ success: false });
    expect(mocks.warn).toHaveBeenCalledWith(
      "Invalid apply options",
      expect.objectContaining({ issues: expect.any(Array) }),
    );
    expect(mocks.dispatchTask).not.toHaveBeenCalled();
  });

  it("propagates apply errors instead of reporting success", async () => {
    mocks.dispatchTask.mockRejectedValueOnce(
      new Error("Terraform apply failed"),
    );
    await expect(
      executor(
        {
          projectRoot: "infra/resources/prod",
        },
        context,
      ),
    ).rejects.toThrow("Terraform apply failed");
  });

  it("rejects old positional arguments rather than applying without the saved plan", async () => {
    await expect(
      executor(
        {
          __unparsed__: ["saved.tfplan"],
          projectRoot: "infra/resources/prod",
        },
        context,
      ),
    ).resolves.toEqual({ success: false });
    expect(mocks.dispatchTask).not.toHaveBeenCalled();
  });
});
