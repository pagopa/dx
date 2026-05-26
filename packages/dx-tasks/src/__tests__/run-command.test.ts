import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: mockSpawn,
}));

import { runCommand } from "../run-command.js";

class MockStdout extends EventEmitter {
  public encoding?: string;

  setEncoding(encoding: string) {
    this.encoding = encoding;
    return this;
  }
}

class MockChildProcess extends EventEmitter {
  stdout = new MockStdout();
}

describe("runCommand", () => {
  beforeEach(() => {
    mockSpawn.mockReset();
  });

  it("spawns the command with merged env and resolves captured stdout", async () => {
    const child = new MockChildProcess();
    mockSpawn.mockReturnValue(child);

    const resultPromise = runCommand("terraform", ["plan"], "/tmp/module", {
      TF_IN_AUTOMATION: "true",
    });

    expect(mockSpawn).toHaveBeenCalledWith("terraform", ["plan"], {
      cwd: "/tmp/module",
      env: expect.objectContaining({
        TF_IN_AUTOMATION: "true",
      }),
      stdio: ["inherit", "pipe", "inherit"],
    });
    expect(child.stdout.encoding).toBe("utf8");

    child.stdout.emit("data", "first ");
    child.stdout.emit("data", "second");
    child.emit("close", 0, null);

    await expect(resultPromise).resolves.toEqual({
      exitCode: 0,
      signal: null,
      stdout: "first second",
    });
  });

  it("resolves the terminating signal when the process closes from a signal", async () => {
    const child = new MockChildProcess();
    mockSpawn.mockReturnValue(child);

    const resultPromise = runCommand("terraform", ["plan"], "/tmp/module", {});

    child.emit("close", null, "SIGTERM");

    await expect(resultPromise).resolves.toEqual({
      exitCode: null,
      signal: "SIGTERM",
      stdout: "",
    });
  });

  it("rejects when spawning the process fails", async () => {
    const child = new MockChildProcess();
    const error = new Error("spawn failed");
    mockSpawn.mockReturnValue(child);

    const resultPromise = runCommand("terraform", ["plan"], "/tmp/module", {});

    child.emit("error", error);

    await expect(resultPromise).rejects.toThrow("spawn failed");
  });
});
