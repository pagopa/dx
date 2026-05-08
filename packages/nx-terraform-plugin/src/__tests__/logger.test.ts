import { beforeEach, describe, expect, it, vi } from "vitest";

const logtapeMocks = vi.hoisted(() => ({
  configure: vi.fn(async () => {}),
  getConsoleSink: vi.fn(() => "console-sink"),
  getJsonLinesFormatter: vi.fn(() => "json-lines-formatter"),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
  })),
}));

vi.mock("@logtape/logtape", () => ({
  configure: logtapeMocks.configure,
  getConsoleSink: logtapeMocks.getConsoleSink,
  getJsonLinesFormatter: logtapeMocks.getJsonLinesFormatter,
  getLogger: logtapeMocks.getLogger,
}));

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures logtape when the plugin entrypoint loads", async () => {
    vi.resetModules();

    await import("../index.ts");

    expect(logtapeMocks.configure).toHaveBeenCalledTimes(1);
    expect(logtapeMocks.configure).toHaveBeenCalledWith({
      loggers: [
        {
          category: ["nx-terraform-plugin"],
          lowestLevel: "info",
          sinks: ["console"],
        },
        {
          category: ["logtape", "meta"],
          lowestLevel: "warning",
          sinks: ["console"],
        },
      ],
      sinks: {
        console: "console-sink",
      },
    });
    expect(logtapeMocks.getJsonLinesFormatter).toHaveBeenCalledWith();
    expect(logtapeMocks.getConsoleSink).toHaveBeenCalledWith({
      formatter: "json-lines-formatter",
    });
  });

  it("creates category-prefixed loggers", async () => {
    vi.resetModules();
    const { getPackageLogger } = await import("../logger.ts");

    getPackageLogger(["publish"]);

    expect(logtapeMocks.getLogger).toHaveBeenCalledWith([
      "nx-terraform-plugin",
      "publish",
    ]);
  });
});
