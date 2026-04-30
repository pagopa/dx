import { Command } from "commander";
import { describe, expect, it } from "vitest";

import { exitWithError, isVerbose } from "../index.js";

/**
 * Builds a parent command that exposes the global `--verbose` flag so that
 * `optsWithGlobals()` behaves the same way it does on the real CLI.
 */
const makeProgramWith = (child: Command, argv: string[]): Command => {
  const program = new Command()
    .name("dx")
    .option("-v, --verbose", "verbose output", false)
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
});
