import events from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  default: {
    spawn: mockSpawn,
  },
  spawn: mockSpawn,
}));

import { runCommand } from "../run-command.js";

class MockOutputStream extends events.EventEmitter {
  public encoding?: string;

  setEncoding(encoding: string) {
    this.encoding = encoding;
    return this;
  }
}

class MockChildProcess extends events.EventEmitter {
  stderr = new MockOutputStream();
  stdout = new MockOutputStream();
}

describe("runCommand", () => {
  beforeEach(() => {
    mockSpawn.mockReset();
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns the command with merged env and resolves captured output", async () => {
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
      stdio: ["inherit", "pipe", "pipe"],
    });
    expect(child.stderr.encoding).toBe("utf8");
    expect(child.stdout.encoding).toBe("utf8");

    child.stdout.emit("data", "first ");
    child.stdout.emit("data", "second");
    child.stderr.emit("data", "diagnostic");
    child.emit("close", 0, null);

    await expect(resultPromise).resolves.toEqual({
      exitCode: 0,
      signal: null,
      stderr: "diagnostic",
      stdout: "first second",
    });
    expect(process.stderr.write).toHaveBeenCalledExactlyOnceWith("diagnostic");
  });

  it("resolves the terminating signal when the process closes from a signal", async () => {
    const child = new MockChildProcess();
    mockSpawn.mockReturnValue(child);

    const resultPromise = runCommand("terraform", ["plan"], "/tmp/module", {});

    child.emit("close", null, "SIGTERM");

    await expect(resultPromise).resolves.toEqual({
      exitCode: null,
      signal: "SIGTERM",
      stderr: "",
      stdout: "",
    });
  });

  it("rejects when the process closes without an exit code or signal", async () => {
    const child = new MockChildProcess();
    mockSpawn.mockReturnValue(child);

    const resultPromise = runCommand("terraform", ["plan"], "/tmp/module", {});

    child.emit("close", null, null);

    await expect(resultPromise).rejects.toThrow(
      "terraform closed without an exit code or signal",
    );
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
