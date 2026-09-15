/** Deterministic insights for the Terraform Registry Releases dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";

import {
  formatNumber,
  formatPercent,
  halfSplitChange,
  severityFromChange,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

/** A module is considered stale after this many days without a release. */
const STALE_MODULE_DAYS = 180;

export interface ReleasesInsightsInput {
  readonly modulesSummary: readonly {
    readonly lastReleaseDate: null | string;
    readonly moduleName: string;
  }[];
  readonly releasesTimeline: readonly {
    readonly majorVersionsIntroduced: number | string;
  }[];
}

const cadenceInsight = (input: ReleasesInsightsInput): Insight | null => {
  const change = halfSplitChange(
    input.releasesTimeline.map((row) => Number(row.majorVersionsIntroduced)),
  );

  if (change === null) {
    return null;
  }

  const severity = severityFromChange(change.deltaPct, {
    higherIsBetter: true,
    significantChangePct: METRIC_TARGETS.significantChangePct,
  });

  return {
    category: "adoption",
    detail: `New major versions moved from ${formatNumber(change.firstAverage)} to ${formatNumber(change.secondAverage)} per month (${formatNumber(change.deltaPct, 0)}%).`,
    id: "releases-cadence",
    severity,
    title:
      severity === "positive"
        ? "Release cadence growing"
        : severity === "warning"
          ? "Release cadence declining"
          : "Release cadence stable",
    value: { current: change.secondAverage, deltaPct: change.deltaPct },
  };
};

const staleModulesInsight = (input: ReleasesInsightsInput): Insight | null => {
  const dated = input.modulesSummary
    .map((module) => ({
      moduleName: module.moduleName,
      time:
        module.lastReleaseDate === null
          ? Number.NaN
          : Date.parse(module.lastReleaseDate),
    }))
    .filter((module) => Number.isFinite(module.time));

  if (dated.length === 0) {
    return null;
  }

  const latest = Math.max(...dated.map((module) => module.time));
  const stale = dated.filter(
    (module) => latest - module.time > STALE_MODULE_DAYS * 24 * 60 * 60 * 1000,
  );

  const staleShare = stale.length / dated.length;
  const severity = severityFromUpperThreshold(
    staleShare,
    INSIGHT_THRESHOLDS.staleModuleShare,
  );

  return {
    action:
      stale.length > 0
        ? `Review whether modules without a release in ${STALE_MODULE_DAYS} days are still maintained.`
        : undefined,
    category: "quality",
    detail: `${stale.length} of ${dated.length} modules have not received a release in over ${STALE_MODULE_DAYS} days (${formatPercent(staleShare)}).`,
    evidence: stale.slice(0, 3).map((module) => ({ label: module.moduleName })),
    id: "releases-stale-modules",
    severity,
    title:
      stale.length > 0
        ? "Modules without recent releases"
        : "All modules are maintained",
    value: { current: stale.length, unit: "modules" },
  };
};

/** Builds the ordered list of insights for the Releases dashboard. */
export const buildReleasesInsights = (
  input: ReleasesInsightsInput,
): Insight[] =>
  sortInsights(
    [cadenceInsight(input), staleModulesInsight(input)].filter(
      (insight): insight is Insight => insight !== null,
    ),
  );
