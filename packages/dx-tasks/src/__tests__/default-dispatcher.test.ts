import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

import { createDefaultTaskDispatcher } from "../default-dispatcher.ts";

describe("createDefaultTaskDispatcher", () => {
  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("registers terraformPlan and dispatches its decoded payload", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: "No changes.",
    });
    const dispatcher = createDefaultTaskDispatcher();

    await dispatcher.dispatchTask("terraformPlan", {
      modulePath: "/tmp/module",
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["plan"],
      "/tmp/module",
      {
        TF_CLI_ARGS_plan: "-lock-timeout=120s ",
        TF_IN_AUTOMATION: "true",
      },
    );
    expect(console.log).toHaveBeenCalledExactlyOnceWith("No changes.");
  });
});
