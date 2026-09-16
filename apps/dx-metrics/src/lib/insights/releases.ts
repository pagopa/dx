/** Deterministic insights for the Terraform Registry Releases dashboard. */

import { INSIGHT_THRESHOLDS, METRIC_TARGETS } from "@/lib/config";

import {
  confidenceFromFit,
  confidenceFromSample,
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
  /**
   * Freshest release date across the registry, used as the "now" against which
   * module staleness is measured. Anchoring to the data (rather than `Date.now`)
   * keeps the insight comparable when the importer lags behind.
   */
  readonly referenceDate: string;
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
    confidence: confidenceFromFit(change.rSquared),
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
  const referenceTime = Date.parse(input.referenceDate);

  if (!Number.isFinite(referenceTime)) {
    return null;
  }

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

  // Measured against the registry's reference date, not the newest module
  // release: a stale dataset must still surface modules without recent
  // releases instead of comparing modules with each other.
  const stale = dated.filter(
    (module) =>
      referenceTime - module.time > STALE_MODULE_DAYS * 24 * 60 * 60 * 1000,
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
    confidence: confidenceFromSample(dated.length),
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
