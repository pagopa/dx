/**
 * Verifies CLI flags override the manifest comparison mode.
 */
import { describe, expect, it } from "vitest";

import {
  isComparedRun,
  resolveComparison,
  WITHOUT_SKILL_REF,
} from "../comparison.js";

describe("isComparedRun", () => {
  it("is false only for current-only", () => {
    expect(isComparedRun("previous")).toBe(true);
    expect(isComparedRun("without-skill")).toBe(true);
    expect(isComparedRun("current-only")).toBe(false);
  });
});

describe("resolveComparison", () => {
  it("uses the manifest when the CLI is silent", () => {
    expect(
      resolveComparison({ currentOnly: false, manifest: "without-skill" }),
    ).toEqual({ mode: "without-skill" });
    expect(
      resolveComparison({ currentOnly: false, manifest: "current-only" }),
    ).toEqual({ mode: "current-only" });
    expect(
      resolveComparison({ currentOnly: false, manifest: "previous" }),
    ).toEqual({ mode: "previous" });
  });

  it("treats without-skill as a sentinel, not a Git ref", () => {
    expect(
      resolveComparison({
        baselineRef: WITHOUT_SKILL_REF,
        currentOnly: false,
        manifest: "previous",
      }),
    ).toEqual({ mode: "without-skill" });
  });

  it("lets --baseline-ref override a current-only manifest", () => {
    expect(
      resolveComparison({
        baselineRef: "main",
        currentOnly: false,
        manifest: "current-only",
      }),
    ).toEqual({ baselineRef: "main", mode: "previous" });
  });

  it("lets --current-only override the manifest", () => {
    expect(
      resolveComparison({ currentOnly: true, manifest: "previous" }),
    ).toEqual({ mode: "current-only" });
  });

  it("rejects combining --current-only with --baseline-ref", () => {
    expect(() =>
      resolveComparison({
        baselineRef: "main",
        currentOnly: true,
        manifest: "previous",
      }),
    ).toThrow("--current-only cannot be combined with --baseline-ref");
  });
});
