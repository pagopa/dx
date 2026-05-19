import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CliError, ErrorCode, ExitCode } from "../exit-codes.js";
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
  emitEvent,
  exitCodeForError,
  getOutputMode,
  isNonInteractive,
  printResult,
  toErrorPayload,
} from "../output.js";

const setIsTTY = (value: boolean): void => {
  Object.defineProperty(process.stdout, "isTTY", {
    configurable: true,
    value,
  });
};

const originalIsTTYDescriptor = Object.getOwnPropertyDescriptor(
  process.stdout,
  "isTTY",
);

const restoreIsTTY = (): void => {
  if (originalIsTTYDescriptor) {
    Object.defineProperty(process.stdout, "isTTY", originalIsTTYDescriptor);
  } else {
    delete (process.stdout as { isTTY?: boolean }).isTTY;
  }
};

/**
 * Build a root program that exposes the same global flags as the real CLI
 * and parse the given argv, returning the child command so callers can
 * inspect `optsWithGlobals` (which is how the output helpers read state).
 */
const makeProgramWith = (argv: string[]): Command => {
  const program = new Command()
    .name("dx")
    .option("-v, --verbose", "verbose", false)
    .option("-y, --non-interactive", "non interactive", false)
    .option("--output <mode>", "output mode", "text")
    .exitOverride()
    .configureOutput({
      writeErr: () => {
        /* silence */
      },
      writeOut: () => {
        /* silence */
      },
    });
  const child = new Command("run")
    .exitOverride()
    .configureOutput({
      writeErr: () => {
        /* silence */
      },
      writeOut: () => {
        /* silence */
      },
    })
    .action(() => undefined);
  program.addCommand(child);
  program.parse(argv, { from: "user" });
  return child;
};

afterEach(() => {
  vi.restoreAllMocks();
  restoreIsTTY();
});

describe("getOutputMode", () => {
  it("defaults to text", () => {
    const cmd = makeProgramWith(["run"]);
    expect(getOutputMode(cmd)).toBe("text");
  });

  it("returns json when --output=json", () => {
    const cmd = makeProgramWith(["--output", "json", "run"]);
    expect(getOutputMode(cmd)).toBe("json");
  });
});

describe("isNonInteractive", () => {
  beforeEach(() => {
    setIsTTY(true);
  });

  it("is false by default with a TTY", () => {
    const cmd = makeProgramWith(["run"]);
    expect(isNonInteractive(cmd)).toBe(false);
  });

  it("is true when --non-interactive is set", () => {
    const cmd = makeProgramWith(["--non-interactive", "run"]);
    expect(isNonInteractive(cmd)).toBe(true);
  });

  it("is true via -y short flag", () => {
    const cmd = makeProgramWith(["-y", "run"]);
    expect(isNonInteractive(cmd)).toBe(true);
  });

  it("auto-on when --output=json and no TTY", () => {
    setIsTTY(false);
    const cmd = makeProgramWith(["--output", "json", "run"]);
    expect(isNonInteractive(cmd)).toBe(true);
  });

  it("stays interactive when --output=json but a TTY is attached", () => {
    setIsTTY(true);
    const cmd = makeProgramWith(["--output", "json", "run"]);
    expect(isNonInteractive(cmd)).toBe(false);
  });
});

describe("toErrorPayload", () => {
  it("maps a CliError to its code, message and details", () => {
    const err = new CliError(ErrorCode.MISSING_INPUT, "missing", {
      details: { field: "x" },
    });
    const payload = toErrorPayload(err);
    expect(payload.code).toBe(ErrorCode.MISSING_INPUT);
    expect(payload.message).toBe("missing");
    expect(payload.details).toEqual({ field: "x" });
  });

  it("maps a plain Error to E_GENERIC", () => {
    const err = new Error("oops");
    const payload = toErrorPayload(err);
    expect(payload.code).toBe(ErrorCode.GENERIC);
    expect(payload.message).toBe("oops");
  });

  it("flattens the cause chain (excluding the top-level message)", () => {
    const root = new Error("root");
    const mid = new Error("mid", { cause: root });
    const top = new CliError(ErrorCode.REMOTE, "top", { cause: mid });
    const payload = toErrorPayload(top);
    expect(payload.cause).toBe("mid <- root");
  });

  it("handles non-Error values", () => {
    expect(toErrorPayload("plain")).toMatchObject({
      code: ErrorCode.GENERIC,
      message: "plain",
    });
    expect(toErrorPayload({ foo: 1 })).toMatchObject({
      code: ErrorCode.GENERIC,
    });
  });
});

describe("printResult", () => {
  it("writes a single JSON line to stdout in json mode", () => {
    const cmd = makeProgramWith(["--output", "json", "run"]);
    const written: string[] = [];
    printResult(cmd, buildSuccessEnvelope(cmd, { foo: "bar" }), {
      stdout: (chunk) => written.push(chunk),
    });
    expect(written).toHaveLength(1);
    const parsed = JSON.parse(written[0] ?? "");
    expect(parsed).toEqual({
      command: "run",
      data: { foo: "bar" },
      ok: true,
    });
    expect(written[0]?.endsWith("\n")).toBe(true);
  });

  it("is a no-op in text mode", () => {
    const cmd = makeProgramWith(["run"]);
    const written: string[] = [];
    printResult(cmd, buildSuccessEnvelope(cmd, { foo: "bar" }), {
      stdout: (chunk) => written.push(chunk),
    });
    expect(written).toEqual([]);
  });

  it("serialises error envelopes too", () => {
    const cmd = makeProgramWith(["--output", "json", "run"]);
    const written: string[] = [];
    const err = new CliError(ErrorCode.VALIDATION, "bad input");
    printResult(cmd, buildErrorEnvelope(cmd, err), {
      stdout: (chunk) => written.push(chunk),
    });
    const parsed = JSON.parse(written[0] ?? "");
    expect(parsed).toMatchObject({
      command: "run",
      error: { code: ErrorCode.VALIDATION, message: "bad input" },
      ok: false,
    });
  });
});

describe("emitEvent", () => {
  it("writes NDJSON events to stderr in json mode", () => {
    const cmd = makeProgramWith(["--output", "json", "run"]);
    const written: string[] = [];
    emitEvent(
      cmd,
      { event: "step", name: "createRepo", status: "started" },
      { stderr: (chunk) => written.push(chunk) },
    );
    emitEvent(
      cmd,
      {
        durationMs: 42,
        event: "step",
        name: "createRepo",
        status: "succeeded",
      },
      { stderr: (chunk) => written.push(chunk) },
    );
    expect(written).toHaveLength(2);
    expect(JSON.parse(written[0] ?? "")).toMatchObject({
      event: "step",
      name: "createRepo",
      status: "started",
    });
    expect(JSON.parse(written[1] ?? "")).toMatchObject({
      durationMs: 42,
      status: "succeeded",
    });
  });

  it("is a no-op in text mode", () => {
    const cmd = makeProgramWith(["run"]);
    const written: string[] = [];
    emitEvent(
      cmd,
      { event: "step", name: "noop", status: "started" },
      { stderr: (chunk) => written.push(chunk) },
    );
    expect(written).toEqual([]);
  });
});

describe("exitCodeForError", () => {
  it("uses the CliError code", () => {
    expect(
      exitCodeForError(new CliError(ErrorCode.REMOTE, "remote failure")),
    ).toBe(ExitCode.REMOTE);
  });

  it("falls back to GENERIC for plain Error", () => {
    expect(exitCodeForError(new Error("boom"))).toBe(ExitCode.GENERIC);
  });
});
