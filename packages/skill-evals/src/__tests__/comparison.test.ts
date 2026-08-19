/**
 * Verifies CLI flags override the manifest comparison mode.
 */
import { describe, expect, it } from "vitest";

import { isComparedRun, resolveComparison } from "../comparison.js";

const silent = {
  currentOnly: false,
  noBaseline: false,
} as const;

describe("isComparedRun", () => {
  it("is false only for current-only", () => {
    expect(isComparedRun("previous")).toBe(true);
    expect(isComparedRun("without-skill")).toBe(true);
    expect(isComparedRun("current-only")).toBe(false);
  });
});

describe("resolveComparison", () => {
  it("uses the manifest when the CLI is silent", () => {
    expect(resolveComparison({ ...silent, manifest: "without-skill" })).toEqual(
      { mode: "without-skill" },
    );
    expect(resolveComparison({ ...silent, manifest: "current-only" })).toEqual({
      mode: "current-only",
    });
    expect(resolveComparison({ ...silent, manifest: "previous" })).toEqual({
      mode: "previous",
    });
  });

  it("treats --baseline-ref as a Git ref, including without-skill", () => {
    expect(
      resolveComparison({
        ...silent,
        baselineRef: "without-skill",
        manifest: "previous",
      }),
    ).toEqual({ baselineRef: "without-skill", mode: "previous" });
  });

  it("lets --no-baseline override the manifest", () => {
    expect(
      resolveComparison({
        ...silent,
        manifest: "previous",
        noBaseline: true,
      }),
    ).toEqual({ mode: "without-skill" });
  });

  it("lets --baseline-ref override a current-only manifest", () => {
    expect(
      resolveComparison({
        ...silent,
        baselineRef: "main",
        manifest: "current-only",
      }),
    ).toEqual({ baselineRef: "main", mode: "previous" });
  });

  it("lets --current-only override the manifest", () => {
    expect(
      resolveComparison({
        ...silent,
        currentOnly: true,
        manifest: "previous",
      }),
    ).toEqual({ mode: "current-only" });
  });

  it("rejects combining exclusive CLI overrides", () => {
    expect(() =>
      resolveComparison({
        baselineRef: "main",
        currentOnly: true,
        manifest: "previous",
        noBaseline: false,
      }),
    ).toThrow("cannot be combined");
    expect(() =>
      resolveComparison({
        currentOnly: true,
        manifest: "previous",
        noBaseline: true,
      }),
    ).toThrow("cannot be combined");
    expect(() =>
      resolveComparison({
        baselineRef: "main",
        currentOnly: false,
        manifest: "previous",
        noBaseline: true,
      }),
    ).toThrow("cannot be combined");
  });
});
