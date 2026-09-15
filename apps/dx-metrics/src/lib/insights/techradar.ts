/** Deterministic insights for the Techradar dashboard. */

import { INSIGHT_THRESHOLDS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  confidenceFromSample,
  formatNumber,
  formatPercent,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface TechRadarInsightsInput {
  readonly adoptionByTool: readonly {
    readonly adoptionPercentage: number;
    readonly radarStatus: string;
    readonly repositoryCount: number;
    readonly toolName: string;
  }[];
  readonly summary: {
    readonly detectedUsages: number;
    readonly repositoriesTotal: number;
    readonly repositoriesWithDetectedTools: number;
    readonly toolsDetected: number;
    readonly usagesNotInRadar: number;
  };
  readonly usageTrend?: readonly {
    readonly capturedAt: string;
    readonly repositoryCount: number;
    readonly toolKey: string;
    readonly toolName: string;
  }[];
}

const coverageInsight = (input: TechRadarInsightsInput): Insight | null => {
  const { repositoriesTotal, repositoriesWithDetectedTools } = input.summary;

  if (repositoriesTotal === 0) {
    return null;
  }

  const coverage = share(repositoriesWithDetectedTools, repositoriesTotal);

  if (coverage === null) {
    return null;
  }

  return {
    category: "adoption",
    confidence: confidenceFromSample(repositoriesTotal),
    detail: `${repositoriesWithDetectedTools}/${repositoriesTotal} repositories have at least one detected tool (${formatPercent(coverage)}).`,
    id: "techradar-coverage",
    severity:
      coverage < INSIGHT_THRESHOLDS.techradarCoverage ? "warning" : "positive",
    title:
      coverage < INSIGHT_THRESHOLDS.techradarCoverage
        ? "Few repositories with detected tools"
        : "Good detection coverage",
    value: { current: coverage * 100, unit: "%" },
  };
};

const governanceGapInsight = (
  input: TechRadarInsightsInput,
): Insight | null => {
  const { detectedUsages, usagesNotInRadar } = input.summary;

  if (detectedUsages === 0) {
    return null;
  }

  const gap = share(usagesNotInRadar, detectedUsages);

  if (gap === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    gap,
    INSIGHT_THRESHOLDS.governanceGapShare,
  );
  const significant = severity !== "positive";

  return {
    action: significant
      ? "Consider adding the most used untracked tools to the radar."
      : undefined,
    category: "adoption",
    confidence: confidenceFromSample(detectedUsages),
    detail: `${formatPercent(gap)} of detected usages are not mapped to a radar entry.`,
    id: "techradar-governance-gap",
    severity,
    title: significant
      ? "Tools used but outside the radar"
      : "Usages aligned with the radar",
    value: { current: gap * 100, unit: "%" },
  };
};

const topToolInsight = (input: TechRadarInsightsInput): Insight | null => {
  if (input.adoptionByTool.length === 0) {
    return null;
  }

  const top = [...input.adoptionByTool].sort(
    (left, right) => right.adoptionPercentage - left.adoptionPercentage,
  )[0];

  if (top === undefined) {
    return null;
  }

  return {
    category: "adoption",
    detail: `The most adopted tool is "${top.toolName}" (${formatNumber(top.adoptionPercentage)}% of repositories, ${top.repositoryCount} repos).`,
    id: "techradar-top-tool",
    severity: "neutral",
    title: "Most adopted tool",
    value: { current: top.adoptionPercentage, unit: "%" },
  };
};

const usageTrendInsight = (input: TechRadarInsightsInput): Insight | null => {
  const trend = input.usageTrend ?? [];

  if (trend.length === 0) {
    return null;
  }

  const byTool = new Map<
    string,
    {
      pointsByCapturedAt: Map<string, number>;
      toolName: string;
    }
  >();

  for (const row of trend) {
    const entry = byTool.get(row.toolKey) ?? {
      pointsByCapturedAt: new Map<string, number>(),
      toolName: row.toolName,
    };
    // The dashboard chart sums `repositoryCount` across rows per date. The
    // insight aggregates the same way, so it stays consistent even if a tool
    // ever produces more than one row per snapshot (e.g. per-ring counting).
    entry.pointsByCapturedAt.set(
      row.capturedAt,
      (entry.pointsByCapturedAt.get(row.capturedAt) ?? 0) + row.repositoryCount,
    );
    byTool.set(row.toolKey, entry);
  }

  let best: {
    delta: number;
    first: number;
    last: number;
    toolName: string;
  } | null = null;

  for (const entry of byTool.values()) {
    const sorted = [...entry.pointsByCapturedAt.entries()].sort((left, right) =>
      left[0].localeCompare(right[0]),
    );

    if (sorted.length < 2) {
      continue;
    }

    const first = sorted[0][1];
    const last = sorted[sorted.length - 1][1];
    const delta = last - first;

    if (best === null || Math.abs(delta) > Math.abs(best.delta)) {
      best = { delta, first, last, toolName: entry.toolName };
    }
  }

  if (best === null) {
    return null;
  }

  const severity =
    best.delta > 0 ? "positive" : best.delta < 0 ? "warning" : "neutral";

  return {
    category: "adoption",
    detail: `"${best.toolName}" moved from ${best.first} to ${best.last} repositories across recorded snapshots.`,
    id: "techradar-usage-trend",
    severity,
    title:
      severity === "positive"
        ? "Tool adoption growing"
        : severity === "warning"
          ? "Tool adoption declining"
          : "Tool adoption stable",
    value: { current: best.last, previous: best.first, unit: "repos" },
  };
};

/** Builds the ordered list of insights for the Techradar dashboard. */
export const buildTechRadarInsights = (
  input: TechRadarInsightsInput,
): Insight[] =>
  sortInsights(
    [
      coverageInsight(input),
      governanceGapInsight(input),
      topToolInsight(input),
      usageTrendInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
