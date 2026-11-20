/**
 * Tests for findingsFromAnalysisResult — verifies the adapter that converts
 * a legacy `AnalysisResult.reason` string into a structured `Finding[]`.
 *
 * Behaviours covered:
 * 1. Empty / whitespace-only reason → empty array.
 * 2. Single sentence (with or without trailing period) → one finding.
 * 3. Multi-sentence reason (". " separator) → one finding per sentence.
 * 4. Trailing period on the whole string → not duplicated.
 * 5. Custom `code` → propagated to every finding.
 * 6. Omitted `code` → defaults to "custom.unknown".
 * 7. Custom `source` → propagated.
 * 8. Omitted `source` → defaults to "custom".
 * 9. Every finding carries the correct `resourceId`, `severity`, `category`.
 */

import { describe, expect, it } from "vitest";

import { findingsFromAnalysisResult } from "../finding.js";

const BASE_ARGS = {
  reason: "Low CPU usage.",
  resourceId:
    "/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm",
  severity: "high" as const,
};

describe("findingsFromAnalysisResult", () => {
  describe("empty / whitespace input", () => {
    it("returns [] for an empty string", () => {
      expect(findingsFromAnalysisResult({ ...BASE_ARGS, reason: "" })).toEqual(
        [],
      );
    });

    it("returns [] for a whitespace-only string", () => {
      expect(
        findingsFromAnalysisResult({ ...BASE_ARGS, reason: "   " }),
      ).toEqual([]);
    });

    it("returns [] for a bare period", () => {
      expect(findingsFromAnalysisResult({ ...BASE_ARGS, reason: "." })).toEqual(
        [],
      );
    });
  });

  describe("single sentence", () => {
    it("returns one finding with a trailing period", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "VM is deallocated.",
      });
      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe("VM is deallocated.");
    });

    it("appends a trailing period when missing", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "VM is deallocated",
      });
      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe("VM is deallocated.");
    });
  });

  describe("multi-sentence reason", () => {
    it("splits on '. ' into separate findings", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "VM is deallocated. No tags found. Low CPU usage.",
      });
      expect(result).toHaveLength(3);
      expect(result[0].reason).toBe("VM is deallocated.");
      expect(result[1].reason).toBe("No tags found.");
      expect(result[2].reason).toBe("Low CPU usage.");
    });

    it("does not create an extra empty finding for a trailing period", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "Sentence one. Sentence two.",
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("code field", () => {
    it("uses the provided code for every finding", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        code: "vm.deallocated",
        reason: "A. B.",
      });
      expect(result.every((f) => f.code === "vm.deallocated")).toBe(true);
    });

    it("defaults code to 'custom.unknown' when omitted", () => {
      const result = findingsFromAnalysisResult(BASE_ARGS);
      expect(result[0].code).toBe("custom.unknown");
    });
  });

  describe("source field", () => {
    it("uses the provided source for every finding", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        source: "advisor",
      });
      expect(result.every((f) => f.source === "advisor")).toBe(true);
    });

    it("defaults source to 'custom' when omitted", () => {
      const result = findingsFromAnalysisResult(BASE_ARGS);
      expect(result[0].source).toBe("custom");
    });
  });

  describe("static fields on every finding", () => {
    it("propagates resourceId to every finding", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "A. B.",
      });
      expect(result.every((f) => f.resourceId === BASE_ARGS.resourceId)).toBe(
        true,
      );
    });

    it("propagates severity to every finding", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "A. B.",
        severity: "medium",
      });
      expect(result.every((f) => f.severity === "medium")).toBe(true);
    });

    it("sets category to 'cost' on every finding", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "A. B.",
      });
      expect(result.every((f) => f.category === "cost")).toBe(true);
    });

    it("never attaches estimatedMonthlySavings to custom findings", () => {
      // Custom analyzers carry the resource's monthly cost on
      // `AnalysisResult.estimatedMonthlySavings` and the report layer
      // renders it at the resource level. Propagating it down to a
      // single finding sentence (e.g. "No tags found") would falsely
      // suggest that fixing that sentence yields the full saving.
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "Low CPU. Low network. Idle.",
      });
      expect(result).toHaveLength(3);
      for (const f of result) {
        expect(f.estimatedMonthlySavings).toBeUndefined();
      }
    });

    it("omits estimatedMonthlySavings entirely", () => {
      const result = findingsFromAnalysisResult({
        ...BASE_ARGS,
        reason: "Low CPU.",
      });
      expect(result[0].estimatedMonthlySavings).toBeUndefined();
    });
  });
});
