import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CliError, ErrorCode, ExitCode } from "../exit-codes.js";
import { exitWithError, isVerbose } from "../index.js";

/**
 * Builds a parent command that exposes the global `--verbose` flag so that
 * `optsWithGlobals()` behaves the same way it does on the real CLI.
 */
const makeProgramWith = (child: Command, argv: string[]): Command => {
  const program = new Command()
    .name("dx")
    .option("-v, --verbose", "verbose output", false)
    .option("-y, --non-interactive", "non interactive", false)
    .option("--output <mode>", "output mode", "text")
    .exitOverride()
    .configureOutput({
      writeErr: () => {
        /* silence stderr in tests */
      },
      writeOut: () => {
        /* silence stdout in tests */
      },
    });
  child.exitOverride().configureOutput({
    writeErr: () => {
      /* silence */
    },
    writeOut: () => {
      /* silence */
    },
  });
  program.addCommand(child);
  program.parse(argv, { from: "user" });
  return program;
};

/**
 * `exitWithError` always throws (Commander's `exitOverride()` converts the
 * process.exit call into a CommanderError throw). This helper captures that
 * throw so tests can assert on the thrown payload without putting `expect`
 * inside a `catch` block (which vitest/no-conditional-expect disallows).
 */
const captureThrown = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error: unknown) {
    return error;
  }
  throw new Error("expected the callback to throw");
};

describe("isVerbose", () => {
  it("is false when --verbose is not provided", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["run"]);
    expect(isVerbose(cmd)).toBe(false);
  });

  it("is true when -v is provided at the root", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["-v", "run"]);
    expect(isVerbose(cmd)).toBe(true);
  });

  it("is true when --verbose is provided at the root", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["--verbose", "run"]);
    expect(isVerbose(cmd)).toBe(true);
  });
});

describe("exitWithError", () => {
  it("reports only the message in normal mode", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["run"]);
    const err = new Error("outer", { cause: new Error("inner secret") });
    expect(() => exitWithError(cmd)(err)).toThrow(/outer/);
    const thrown = captureThrown(() => exitWithError(cmd)(err));
    const message = String(
      (thrown as null | { message?: string })?.message ?? thrown,
    );
    expect(message).not.toContain("Caused by");
    expect(message).not.toContain("inner secret");
  });

  it("includes the cause chain and stack trace in verbose mode", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["--verbose", "run"]);
    const root = new Error("root cause");
    const err = new Error("surface", { cause: root });
    const thrown = captureThrown(() => exitWithError(cmd)(err));
    const message = String(
      (thrown as null | { message?: string })?.message ?? thrown,
    );
    expect(message).toContain("Error: surface");
    expect(message).toContain("Caused by: Error: root cause");
    expect(message).toContain("at ");
  });

  it("works with non-Error values", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["run"]);
    expect(() => exitWithError(cmd)("plain string failure")).toThrow(
      /plain string failure/,
    );
  });

  it("emits a JSON error envelope on stdout when --output=json", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["--output", "json", "run"]);
    const written: string[] = [];
    const originalWrite = process.stdout.write.bind(process.stdout);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = (chunk: unknown): boolean => {
      written.push(String(chunk));
      return true;
    };
    const err = new CliError(ErrorCode.MISSING_INPUT, "missing field", {
      details: { field: "name" },
    });
    let thrown: unknown;
    try {
      exitWithError(cmd)(err);
    } catch (e) {
      thrown = e;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = originalWrite;

    const envelope = JSON.parse(written.join("").trim());
    expect(envelope).toMatchObject({
      command: "run",
      error: {
        code: ErrorCode.MISSING_INPUT,
        details: { field: "name" },
        message: "missing field",
      },
      ok: false,
    });
    expect((thrown as null | { exitCode?: number })?.exitCode).toBe(
      ExitCode.MISSING_INPUT,
    );
  });

  it("uses GENERIC exit code in json mode for non-CliError values", () => {
    const cmd = new Command("run").action(() => undefined);
    makeProgramWith(cmd, ["--output", "json", "run"]);
    const originalWrite = process.stdout.write.bind(process.stdout);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = (): boolean => true;
    let thrown: unknown;
    try {
      exitWithError(cmd)(new Error("boom"));
    } catch (e) {
      thrown = e;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = originalWrite;
    expect((thrown as null | { exitCode?: number })?.exitCode).toBe(
      ExitCode.GENERIC,
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
