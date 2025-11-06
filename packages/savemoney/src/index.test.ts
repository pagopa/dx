import { describe, expect, it } from "vitest";

import type { AnalysisResult } from "./index.js";

import { mergeResults } from "./index.js";

describe("mergeResults", () => {
  it("should concatenate reasons from both results", () => {
    const baseResult: AnalysisResult = {
      costRisk: "low",
      reason: "No tags found. ",
      suspectedUnused: true,
    };
    const specificResult: AnalysisResult = {
      costRisk: "medium",
      reason: "Disk is unattached. ",
      suspectedUnused: true,
    };

    const merged = mergeResults(baseResult, specificResult);

    expect(merged.reason).toBe("No tags found. Disk is unattached. ");
    expect(merged.costRisk).toBe("medium");
    expect(merged.suspectedUnused).toBe(true);
  });

  it("should use specific result's cost risk", () => {
    const baseResult: AnalysisResult = {
      costRisk: "low",
      reason: "Base reason. ",
      suspectedUnused: false,
    };
    const specificResult: AnalysisResult = {
      costRisk: "high",
      reason: "High risk reason. ",
      suspectedUnused: true,
    };

    const merged = mergeResults(baseResult, specificResult);

    expect(merged.costRisk).toBe("high");
  });

  it("should OR suspectedUnused flags", () => {
    const baseResult: AnalysisResult = {
      costRisk: "low",
      reason: "Base. ",
      suspectedUnused: false,
    };
    const specificResult: AnalysisResult = {
      costRisk: "medium",
      reason: "Specific. ",
      suspectedUnused: true,
    };

    const merged = mergeResults(baseResult, specificResult);

    expect(merged.suspectedUnused).toBe(true);
  });

  it("should handle empty reasons", () => {
    const baseResult: AnalysisResult = {
      costRisk: "low",
      reason: "",
      suspectedUnused: false,
    };
    const specificResult: AnalysisResult = {
      costRisk: "medium",
      reason: "Only specific reason. ",
      suspectedUnused: false,
    };

    const merged = mergeResults(baseResult, specificResult);

    expect(merged.reason).toBe("Only specific reason. ");
  });

  it("should preserve both reasons when both are present", () => {
    const baseResult: AnalysisResult = {
      costRisk: "low",
      reason: "First issue. ",
      suspectedUnused: true,
    };
    const specificResult: AnalysisResult = {
      costRisk: "high",
      reason: "Second issue. ",
      suspectedUnused: false,
    };

    const merged = mergeResults(baseResult, specificResult);

    expect(merged.reason).toBe("First issue. Second issue. ");
    expect(merged.suspectedUnused).toBe(true); // true OR false = true
  });
});
