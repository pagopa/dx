/** Deterministic insights for the DX Adoption dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  confidenceFromSample,
  formatPercent,
  severityFromTarget,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface DxAdoptionInsightsInput {
  readonly moduleAdoption: readonly {
    readonly moduleCount: number;
    readonly moduleType: string;
  }[];
  readonly pipelineAdoption: readonly {
    readonly pipelineCount: number;
    readonly pipelineType: string;
  }[];
  readonly versionDriftList: readonly {
    readonly driftStatus: string;
    readonly latestVersion: null | string;
    readonly moduleName: string;
    readonly usedVersion: null | string;
  }[];
  readonly versionDriftSummary: {
    readonly outdated: number;
    readonly total: number;
    readonly unknown: number;
    readonly upToDate: number;
  };
}

const pipelineAdoptionInsight = (
  input: DxAdoptionInsightsInput,
): Insight | null => {
  const dx = input.pipelineAdoption
    .filter((row) => row.pipelineType.startsWith("DX"))
    .reduce((sum, row) => sum + row.pipelineCount, 0);
  const total = input.pipelineAdoption.reduce(
    (sum, row) => sum + row.pipelineCount,
    0,
  );

  if (total === 0) {
    return null;
  }

  const adoption = share(dx, total);

  if (adoption === null) {
    return null;
  }

  const onTarget = adoption * 100 >= METRIC_TARGETS.dxPipelineAdoptionPct;

  return {
    category: "adoption",
    confidence: confidenceFromSample(total),
    detail: `${formatPercent(adoption)} of pipelines use DX workflows (target ${METRIC_TARGETS.dxPipelineAdoptionPct}%).`,
    id: "dx-adoption-pipeline",
    severity: severityFromTarget(
      adoption * 100,
      METRIC_TARGETS.dxPipelineAdoptionPct,
      {
        higherIsBetter: true,
        tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
      },
    ),
    title: onTarget
      ? "DX pipeline adoption on target"
      : "DX pipeline adoption below target",
    value: { current: adoption * 100, unit: "%" },
  };
};

const moduleAdoptionInsight = (
  input: DxAdoptionInsightsInput,
): Insight | null => {
  const dx = input.moduleAdoption
    .filter((row) => row.moduleType.startsWith("DX"))
    .reduce((sum, row) => sum + row.moduleCount, 0);
  const total = input.moduleAdoption.reduce(
    (sum, row) => sum + row.moduleCount,
    0,
  );

  if (total === 0) {
    return null;
  }

  const adoption = share(dx, total);

  if (adoption === null) {
    return null;
  }

  return {
    category: "adoption",
    confidence: confidenceFromSample(total),
    detail: `${formatPercent(adoption)} of Terraform modules are DX modules.`,
    id: "dx-adoption-modules",
    severity: "neutral",
    title: "DX modules adopted",
    value: { current: adoption * 100, unit: "%" },
  };
};

const versionDriftInsight = (
  input: DxAdoptionInsightsInput,
): Insight | null => {
  const { outdated, total, unknown, upToDate } = input.versionDriftSummary;

  if (total === 0) {
    return null;
  }

  const freshness = share(upToDate, total);

  if (freshness === null) {
    return null;
  }

  const onTarget = freshness * 100 >= METRIC_TARGETS.moduleUpToDatePct;
  const outdatedModules = input.versionDriftList.filter(
    (row) => row.driftStatus === "outdated",
  );

  // The drift list has one row per (module, file), so the same module can appear
  // many times. Collapse by module for readable, unique evidence.
  const outdatedByModule = new Map<
    string,
    { count: number; latestVersion: null | string; usedVersion: null | string }
  >();

  for (const row of outdatedModules) {
    const entry = outdatedByModule.get(row.moduleName) ?? {
      count: 0,
      latestVersion: row.latestVersion,
      usedVersion: row.usedVersion,
    };
    entry.count += 1;
    outdatedByModule.set(row.moduleName, entry);
  }

  const evidence = [...outdatedByModule.entries()]
    .sort(
      (left, right) =>
        right[1].count - left[1].count || left[0].localeCompare(right[0]),
    )
    .slice(0, 3)
    .map(([moduleName, entry]) => ({
      label: `${moduleName}: ${entry.usedVersion ?? "?"} → ${entry.latestVersion ?? "?"}${entry.count > 1 ? ` (${entry.count} files)` : ""}`,
    }));

  return {
    action:
      outdatedModules.length > 0
        ? "Upgrade the listed modules to the latest major version."
        : undefined,
    category: "adoption",
    confidence: confidenceFromSample(total),
    detail: `${upToDate}/${total} DX modules are up to date (${formatPercent(freshness)}), ${outdated} outdated${unknown > 0 ? `, ${unknown} without a version` : ""}.`,
    evidence,
    id: "dx-adoption-version-drift",
    severity: severityFromTarget(
      freshness * 100,
      METRIC_TARGETS.moduleUpToDatePct,
      {
        higherIsBetter: true,
        tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
      },
    ),
    title: onTarget ? "DX modules up to date" : "DX modules out of date",
    value: { current: freshness * 100, unit: "%" },
  };
};

/** Builds the ordered list of insights for the DX Adoption dashboard. */
export const buildDxAdoptionInsights = (
  input: DxAdoptionInsightsInput,
): Insight[] =>
  sortInsights(
    [
      pipelineAdoptionInsight(input),
      moduleAdoptionInsight(input),
      versionDriftInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
