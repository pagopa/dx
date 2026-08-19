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

describe("formatLogLine", () => {
  it("uses the eval name next to the level when present", async () => {
    vi.resetModules();
    const { formatLogLine } = await import("../logging.ts");

    expect(
      formatLogLine({
        category: "eval",
        level: "DBG",
        message: "Starting Copilot turn 1",
        properties: { eval: "create-function-app" },
        timestamp: "10:21:00.000",
      }),
    ).toBe("10:21:00.000 [DBG] create-function-app: Starting Copilot turn 1");
  });

  it("adds the skill ref after the eval name", async () => {
    vi.resetModules();
    const { formatLogLine } = await import("../logging.ts");

    expect(
      formatLogLine({
        category: "eval",
        level: "DBG",
        message: "Started tool view",
        properties: { eval: "create-function-app", skillRef: "local" },
        timestamp: "10:21:00.000",
      }),
    ).toBe("10:21:00.000 [DBG] create-function-app (local): Started tool view");
  });

  it("keeps the category when no eval is active", async () => {
    vi.resetModules();
    const { formatLogLine } = await import("../logging.ts");

    expect(
      formatLogLine({
        category: "eval",
        level: "DBG",
        message: "Preparing runtime",
        timestamp: "10:21:00.000",
      }),
    ).toBe("10:21:00.000 [DBG] eval: Preparing runtime");
  });
});

describe("escapeLogTapeLiterals", () => {
  it("keeps known placeholders and escapes JSON braces", async () => {
    vi.resetModules();
    const { escapeLogTapeLiterals } = await import("../logging.ts");
    const args = '{\n  "path": "infra/main.tf"\n}';

    expect(
      escapeLogTapeLiterals(`Started tool {tool}\n  ${args}`, {
        tool: "view",
      }),
    ).toBe('Started tool {tool}\n  {{\n  "path": "infra/main.tf"\n}}');
  });

  it("leaves messages without braces unchanged", async () => {
    vi.resetModules();
    const { escapeLogTapeLiterals } = await import("../logging.ts");

    expect(escapeLogTapeLiterals("Copilot session started", {})).toBe(
      "Copilot session started",
    );
  });
});

describe("toProgressSink", () => {
  it("forwards escaped messages to the logger", async () => {
    vi.resetModules();
    const { toProgressSink } = await import("../logging.ts");
    const debug = vi.fn();
    const info = vi.fn();
    const sink = toProgressSink({ debug, info });

    sink.debug('Started tool view\n  {\n  "path": "infra/main.tf"\n}', {
      tool: "view",
    });

    expect(debug).toHaveBeenCalledWith(
      'Started tool view\n  {{\n  "path": "infra/main.tf"\n}}',
      { tool: "view" },
    );
  });
});

describe("formatLogValue", () => {
  it("prints strings without inspect quoting", async () => {
    vi.resetModules();
    const { formatLogValue } = await import("../logging.ts");
    const inspect = vi.fn(() => '"quoted\\n" + "lines"');

    expect(formatLogValue("hello\nworld", inspect)).toBe("hello\nworld");
    expect(inspect).not.toHaveBeenCalled();
    expect(formatLogValue({ path: "infra" }, inspect)).toBe(
      '"quoted\\n" + "lines"',
    );
  });
});

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
      value: expect.any(Function),
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
