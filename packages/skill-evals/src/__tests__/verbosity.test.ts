/**
 * Verifies CLI verbosity parsing for -v, -vv, and --verbose=2.
 */
import { describe, expect, it } from "vitest";

import { parseCliVerbosity } from "../verbosity.js";

describe("parseCliVerbosity", () => {
  it("defaults to quiet when the flag is absent", () => {
    expect(parseCliVerbosity(["eval", "--skill", "plugins/x"])).toBe(0);
  });

  it("treats a single -v or --verbose as progress output", () => {
    expect(parseCliVerbosity(["-v"])).toBe(1);
    expect(parseCliVerbosity(["--verbose"])).toBe(1);
  });

  it("treats -vv and --verbose=2 as conversation output", () => {
    expect(parseCliVerbosity(["-vv"])).toBe(2);
    expect(parseCliVerbosity(["-v", "-v"])).toBe(2);
    expect(parseCliVerbosity(["--verbose=2"])).toBe(2);
    expect(parseCliVerbosity(["--verbose", "2"])).toBe(2);
    expect(parseCliVerbosity(["-v=2"])).toBe(2);
  });

  it("does not consume a following flag as a level", () => {
    expect(parseCliVerbosity(["--verbose", "--skill", "plugins/x"])).toBe(1);
  });

  it("stops at --", () => {
    expect(parseCliVerbosity(["--", "-vv"])).toBe(0);
  });

  it("rejects levels outside 0-2", () => {
    expect(() => parseCliVerbosity(["--verbose=3"])).toThrow(
      "verbosity must be 0, 1, or 2",
    );
  });
});
