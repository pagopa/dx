/**
 * Verifies the progress port tags lines and stays silent when disabled.
 */
import { describe, expect, it, vi } from "vitest";

import {
  createElapsedTimer,
  createProgress,
  silentProgress,
} from "../progress.js";

describe("createProgress", () => {
  it("forwards debug and info to the logger", () => {
    const debug = vi.fn();
    const info = vi.fn();

    const progress = createProgress({ debug, info }, 1);
    progress.debug("turn {turn}", { turn: 1 });
    progress.info("running {eval}", { eval: "example" });

    expect(debug).toHaveBeenCalledWith("turn {turn}", { turn: 1 });
    expect(info).toHaveBeenCalledWith("running {eval}", { eval: "example" });
    expect(progress.verbose).toBe(true);
    expect(progress.verbosity).toBe(1);
  });

  it("invokes logger methods with their original this", () => {
    const calls: string[] = [];
    const logger = {
      debug(message: string) {
        calls.push(`debug:${this === logger}:${message}`);
      },
      info(message: string) {
        calls.push(`info:${this === logger}:${message}`);
      },
    };

    const progress = createProgress(logger, 1);
    progress.debug("turn");
    progress.info("done");

    expect(calls).toEqual(["debug:true:turn", "info:true:done"]);
  });

  it("tags every line with the active eval name", () => {
    const debug = vi.fn();
    const info = vi.fn();

    const progress = createProgress({ debug, info }, 1).forEval(
      "create-function-app",
    );
    progress.debug("Starting Copilot turn {turn}", { turn: 1 });
    progress.info("Running {eval}", { eval: "create-function-app" });

    expect(debug).toHaveBeenCalledWith("Starting Copilot turn {turn}", {
      eval: "create-function-app",
      turn: 1,
    });
    expect(info).toHaveBeenCalledWith("Running {eval}", {
      eval: "create-function-app",
    });
  });

  it("tags variant lines with the skill ref", () => {
    const debug = vi.fn();

    createProgress({ debug, info: vi.fn() }, 1)
      .forEval("create-function-app", "local")
      .debug("Started tool {tool}", { tool: "view" });

    expect(debug).toHaveBeenCalledWith("Started tool {tool}", {
      eval: "create-function-app",
      skillRef: "local",
      tool: "view",
    });
  });
});

describe("silentProgress", () => {
  it("does not throw when logging", () => {
    expect(() => silentProgress.debug("ignored")).not.toThrow();
    expect(() =>
      silentProgress.forEval("example").debug("ignored"),
    ).not.toThrow();
    expect(silentProgress.verbose).toBe(false);
    expect(silentProgress.verbosity).toBe(0);
  });
});

describe("createElapsedTimer", () => {
  it("reports elapsed time from a provided clock", () => {
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(4_000);

    const elapsed = createElapsedTimer(now);

    expect(elapsed()).toBe("3s");
  });
});
