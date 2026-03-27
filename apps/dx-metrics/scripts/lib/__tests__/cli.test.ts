/** Tests for the CLI argument parser and helpers. */

import { describe, expect, it, vi } from "vitest";

import {
  CliUsageError,
  computeSinceDate,
  HelpRequestedError,
  parseArgs,
} from "../cli";

describe("computeSinceDate", () => {
  it("returns a date 30 days ago by default", () => {
    const result = computeSinceDate(undefined);
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("uses the given number of days", () => {
    const result = computeSinceDate("7");
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("returns today when IMPORT_SINCE_DAYS is 0", () => {
    const result = computeSinceDate("0");
    expect(result).toBe(new Date().toISOString().slice(0, 10));
  });

  it("falls back to defaultDays for non-numeric input", () => {
    const result = computeSinceDate("abc", 10);
    const expected = new Date();
    expected.setDate(expected.getDate() - 10);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("falls back to defaultDays for negative input", () => {
    const result = computeSinceDate("-5", 15);
    const expected = new Date();
    expected.setDate(expected.getDate() - 15);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("falls back to defaultDays for empty string", () => {
    const result = computeSinceDate("");
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("returns a YYYY-MM-DD formatted string", () => {
    const result = computeSinceDate("1");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseArgs", () => {
  it("parses --since correctly", () => {
    const args = parseArgs(["--since", "2024-01-15"], "/tmp");
    expect(args.since).toBe("2024-01-15");
  });

  it("returns empty since when --since is omitted", () => {
    const args = parseArgs([], "/tmp");
    expect(args.since).toBe("");
  });

  it("parses --entity correctly", () => {
    const args = parseArgs(
      ["--since", "2024-01-01", "--entity", "commits"],
      "/tmp",
    );
    expect(args.entity).toBe("commits");
  });

  it("defaults entity to all", () => {
    const args = parseArgs(["--since", "2024-01-01"], "/tmp");
    expect(args.entity).toBe("all");
  });

  it("parses --force flag", () => {
    const args = parseArgs(["--since", "2024-01-01", "--force"], "/tmp");
    expect(args.force).toBe(true);
  });

  it("throws HelpRequestedError on --help", () => {
    expect(() => parseArgs(["--help"], "/tmp")).toThrow(HelpRequestedError);
  });

  it("throws HelpRequestedError on -h", () => {
    expect(() => parseArgs(["-h"], "/tmp")).toThrow(HelpRequestedError);
  });
});
