/**
 * Verifies LogTape is configured for quiet CI or verbose local runs.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const logtapeMocks = vi.hoisted(() => ({
  configure: vi.fn(async () => {}),
  getConsoleSink: vi.fn(() => "console-sink"),
  getLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn() })),
  getTextFormatter: vi.fn(() => "text-formatter"),
}));

vi.mock("@logtape/logtape", () => ({
  configure: logtapeMocks.configure,
  getConsoleSink: logtapeMocks.getConsoleSink,
  getLogger: logtapeMocks.getLogger,
  getTextFormatter: logtapeMocks.getTextFormatter,
}));

describe("logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses info in CI and debug when verbose", async () => {
    vi.resetModules();
    const { configureLogging } = await import("../logging.ts");

    await configureLogging(false);
    await configureLogging(true);

    expect(logtapeMocks.configure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        loggers: expect.arrayContaining([
          expect.objectContaining({
            category: ["skill-evals"],
            lowestLevel: "info",
          }),
        ]),
      }),
    );
    expect(logtapeMocks.configure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        loggers: expect.arrayContaining([
          expect.objectContaining({
            category: ["skill-evals"],
            lowestLevel: "debug",
          }),
        ]),
      }),
    );
    expect(logtapeMocks.getTextFormatter).toHaveBeenCalledWith({
      category: expect.any(Function),
      format: expect.any(Function),
      level: "ABBR",
      timestamp: "time",
    });
    expect(logtapeMocks.getConsoleSink).toHaveBeenCalledWith({
      formatter: "text-formatter",
    });
  });

  it("prefixes package loggers with skill-evals", async () => {
    vi.resetModules();
    const { getPackageLogger } = await import("../logging.ts");

    getPackageLogger(["eval"]);

    expect(logtapeMocks.getLogger).toHaveBeenCalledWith([
      "skill-evals",
      "eval",
    ]);
  });
});
