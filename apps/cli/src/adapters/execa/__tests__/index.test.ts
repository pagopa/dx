import { type ResultPromise } from "execa";
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

    expect(result).toStrictEqual("success");
    expect(execa).toHaveBeenCalledWith("aCommand", ["some", "args"], {
      cwd: "/a/cwd",
    });
  });

  // Note: execa throws an error for non-zero exit codes
  // https://github.com/sindresorhus/execa/blob/964f650be8ea7655494204afae659ceef43b86ac/docs/errors.md?plain=1#L39
  it("should return failure when command fails with exception (this includes non-zero exit codes)", async () => {
    const { execa } = await import("execa");
    const mockError = new Error("Command failed");
    vi.mocked(execa).mockRejectedValueOnce(mockError);

    const result = await executeCommand("anInvalidCommand");
    expect(result).toStrictEqual("failure");
  });
});
