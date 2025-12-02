import { type ResultPromise } from "execa";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { executeCommand } from "../index.js";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

describe("executeCommand", () => {
  it("should return success when command executes with exit code 0", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 0,
      stderr: "",
      stdout: "command output",
    } as Awaited<ResultPromise>);

    const result = await executeCommand("aCommand", ["some", "args"], {
      cwd: "/a/cwd",
    });

    expect(result).toStrictEqual(ok("success"));
    expect(execa).toHaveBeenCalledWith("aCommand", ["some", "args"], {
      cwd: "/a/cwd",
    });
  });

  it("should return error when command fails", async () => {
    const { execa } = await import("execa");
    const mockError = new Error("Command failed");
    vi.mocked(execa).mockRejectedValueOnce(mockError);

    const result = await executeCommand("anIvalidCommand");

    expect(result).toStrictEqual(
      err(new Error('Command execution failed: "anIvalidCommand"')),
    );
  });

  it("should return failure when command has non-zero exit code", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 1,
      stderr: "warning message",
      stdout: "",
    } as Awaited<ResultPromise>);

    const result = await executeCommand("aCommandWithNonZeroExitCode");

    expect(result).toStrictEqual(ok("failure"));
  });
});
