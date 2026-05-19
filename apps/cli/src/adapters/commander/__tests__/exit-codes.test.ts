import { describe, expect, it } from "vitest";

import {
  CliError,
  ErrorCode,
  ExitCode,
  exitCodeForErrorCode,
  isCliError,
} from "../exit-codes.js";

describe("ExitCode", () => {
  it("exposes stable numeric codes", () => {
    expect(ExitCode.OK).toBe(0);
    expect(ExitCode.GENERIC).toBe(1);
    expect(ExitCode.USAGE).toBe(2);
    expect(ExitCode.MISSING_INPUT).toBe(3);
    expect(ExitCode.PRECONDITION).toBe(4);
    expect(ExitCode.REMOTE).toBe(5);
    expect(ExitCode.VALIDATION).toBe(6);
  });
});

describe("exitCodeForErrorCode", () => {
  it("maps every known error code to a distinct exit code", () => {
    expect(exitCodeForErrorCode(ErrorCode.USAGE)).toBe(ExitCode.USAGE);
    expect(exitCodeForErrorCode(ErrorCode.MISSING_INPUT)).toBe(
      ExitCode.MISSING_INPUT,
    );
    expect(exitCodeForErrorCode(ErrorCode.PRECONDITION)).toBe(
      ExitCode.PRECONDITION,
    );
    expect(exitCodeForErrorCode(ErrorCode.REMOTE)).toBe(ExitCode.REMOTE);
    expect(exitCodeForErrorCode(ErrorCode.VALIDATION)).toBe(
      ExitCode.VALIDATION,
    );
  });

  it("falls back to GENERIC for unknown / fallthrough codes", () => {
    expect(exitCodeForErrorCode(ErrorCode.GENERIC)).toBe(ExitCode.GENERIC);
  });
});

describe("CliError", () => {
  it("carries the code, message and optional details", () => {
    const err = new CliError(ErrorCode.MISSING_INPUT, "Missing repo name", {
      details: { field: "repoName" },
    });
    expect(err.code).toBe(ErrorCode.MISSING_INPUT);
    expect(err.message).toBe("Missing repo name");
    expect(err.details).toEqual({ field: "repoName" });
    expect(isCliError(err)).toBe(true);
  });

  it("preserves the cause chain", () => {
    const cause = new Error("boom");
    const err = new CliError(ErrorCode.REMOTE, "Remote call failed", { cause });
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  it("isCliError rejects plain Error and other values", () => {
    expect(isCliError(new Error("nope"))).toBe(false);
    expect(isCliError("string")).toBe(false);
    expect(isCliError(undefined)).toBe(false);
  });
});
