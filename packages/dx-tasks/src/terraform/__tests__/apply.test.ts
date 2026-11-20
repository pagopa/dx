/** Verifies saved-plan masking and the existing interactive apply behavior. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));
vi.mock("../../run-command.ts", () => ({ runCommand: mockRunCommand }));

import { createDefaultTaskDispatcher } from "../../default-dispatcher.ts";
import { terraformApply } from "../apply.ts";

describe("terraformApply", () => {
  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches saved plans and masks both stdout and stderr", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: 'APPINSIGHTS_INSTRUMENTATIONKEY = "private-key"',
      stdout: 'hidden-link = "private-link"',
    });

    await createDefaultTaskDispatcher().dispatchTask("terraformApply", {
      modulePath: "/tmp/module",
      planFile: "saved plan.tfplan",
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      [
        "apply",
        "-input=false",
        "-no-color",
        "-lock-timeout=120s",
        "saved plan.tfplan",
      ],
      "/tmp/module",
      {},
      false,
    );
    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      'hidden-link = "[REDACTED]"\nAPPINSIGHTS_INSTRUMENTATIONKEY = "[REDACTED]"',
    );
  });

  it("preserves interactive local applies when no plan file is supplied", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: "",
    });

    await terraformApply({ modulePath: "/tmp/module" });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["apply"],
      "/tmp/module",
      {},
      true,
    );
    expect(console.log).not.toHaveBeenCalled();
  });

  it.each([
    { exitCode: 42, message: "exited with code 42", signal: null },
    {
      exitCode: null,
      message: "terminated by signal SIGTERM",
      signal: "SIGTERM",
    },
  ])("propagates failures: $message", async ({ exitCode, message, signal }) => {
    mockRunCommand.mockResolvedValue({
      exitCode,
      signal,
      stderr: 'APPINSIGHTS_INSTRUMENTATIONKEY = "private-key"',
      stdout: "",
    });

    await expect(
      terraformApply({
        modulePath: "/tmp/module",
        planFile: "saved.tfplan",
      }),
    ).rejects.toThrow(message);
    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      'APPINSIGHTS_INSTRUMENTATIONKEY = "[REDACTED]"',
    );
  });
});
