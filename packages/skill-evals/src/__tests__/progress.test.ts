/**
 * Verifies the progress port formats usage and stays silent when disabled.
 */
import { describe, expect, it, vi } from "vitest";

import {
  createElapsedTimer,
  createProgress,
  formatUsage,
  silentProgress,
} from "../progress.js";

describe("formatUsage", () => {
  it("summarizes credits, model time, tokens, and models", () => {
    expect(
      formatUsage({
        aiCredits: 1.5,
        durationMs: 61_000,
        inputTokens: 10,
        models: ["gpt-5.6-sol"],
        outputTokens: 4,
      }),
    ).toBe("1.50 credits · 1m 1s model · 10 in / 4 out · gpt-5.6-sol");
  });
});

describe("createProgress", () => {
  it("forwards debug and info to the logger", () => {
    const debug = vi.fn();
    const info = vi.fn();

    const progress = createProgress({ debug, info }, true);
    progress.debug("turn {turn}", { turn: 1 });
    progress.info("running {eval}", { eval: "example" });

    expect(debug).toHaveBeenCalledWith("turn {turn}", { turn: 1 });
    expect(info).toHaveBeenCalledWith("running {eval}", { eval: "example" });
    expect(progress.verbose).toBe(true);
  });
});

describe("silentProgress", () => {
  it("does not throw when logging", () => {
    expect(() => silentProgress.debug("ignored")).not.toThrow();
    expect(silentProgress.verbose).toBe(false);
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
