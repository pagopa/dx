import { ExecaError } from "execa";
import { describe, expect, it } from "vitest";

import { formatErrorDetailed, toErrorMessage } from "../error-reporting.js";

describe("toErrorMessage", () => {
  it("returns the string as-is when given a string", () => {
    expect(toErrorMessage("oops")).toBe("oops");
  });

  it("returns 'Unknown error' for null/undefined", () => {
    expect(toErrorMessage(null)).toBe("Unknown error");
    expect(toErrorMessage(undefined)).toBe("Unknown error");
  });

  it("returns Error.message when given a plain Error", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("prefers ExecaError.shortMessage over message", () => {
    const execaError = Object.assign(
      Object.create(ExecaError.prototype) as ExecaError,
      {
        message: "long noisy message with stderr",
        shortMessage: "Command failed: terraform init",
      },
    );
    expect(toErrorMessage(execaError)).toBe("Command failed: terraform init");
  });

  it("flattens AggregateError into a bulleted message", () => {
    const aggregate = new AggregateError(
      [new Error("first"), new Error("second")],
      "parent",
    );
    expect(toErrorMessage(aggregate)).toBe("parent\n  - first\n  - second");
  });

  it("extracts `message` property from plain objects when present", () => {
    expect(toErrorMessage({ message: "from object" })).toBe("from object");
  });

  it("falls back to JSON.stringify for objects without message", () => {
    expect(toErrorMessage({ code: 42 })).toBe('{"code":42}');
  });
});

describe("formatErrorDetailed", () => {
  it("renders name, message and stack for a single error", () => {
    const err = new Error("top");
    const formatted = formatErrorDetailed(err);
    expect(formatted).toContain("Error: top");
    expect(formatted).toContain("at ");
  });

  it("walks the cause chain", () => {
    const root = new Error("root failure");
    const middle = new Error("middle", { cause: root });
    const top = new Error("top", { cause: middle });

    const formatted = formatErrorDetailed(top);
    expect(formatted).toContain("Error: top");
    expect(formatted).toContain("Caused by: Error: middle");
    expect(formatted).toContain("Caused by: Error: root failure");
  });

  it("terminates when encountering a cycle in the cause chain", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b: Error & { cause?: unknown } = new Error("b", { cause: a });
    a.cause = b;

    const formatted = formatErrorDetailed(a);
    expect(formatted).toContain("Error: a");
    expect(formatted).toContain("Caused by: Error: b");
  });

  it("handles non-Error causes gracefully", () => {
    const err = new Error("wrapped", { cause: "raw string cause" });
    const formatted = formatErrorDetailed(err);
    expect(formatted).toContain("Error: wrapped");
    expect(formatted).toContain("Caused by: raw string cause");
  });
});
