/** Deterministic insights for the Copilot dashboard. */

import { COPILOT_REVIEW_ADOPTION_PCT, INSIGHT_THRESHOLDS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  confidenceFromSample,
  formatNumber,
  formatPercent,
  severityFromTarget,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface CopilotInsightsInput {
  readonly cards: {
    readonly avgLeadTimeHoursWith: null | number;
    readonly avgLeadTimeHoursWithout: null | number;
    readonly copilotAuthoredMergedPrs: number;
    readonly copilotAuthoredPrs: number;
    readonly copilotReviewedPrs: number;
    readonly coverageShare: null | number;
    readonly mergedPrs: number;
  };
  readonly reviewCombination: {
    readonly copilotAndHuman: number;
    readonly copilotOnly: number;
    readonly humanOnly: number;
    readonly noReview: number;
  };
}

/** Rounds a percentage to one decimal so the headline value reads cleanly. */
const roundPct = (value: number): number => Math.round(value * 10) / 10;

const adoptionInsight = (input: CopilotInsightsInput): Insight | null => {
  const { copilotReviewedPrs, coverageShare, mergedPrs } = input.cards;

  if (coverageShare === null || mergedPrs === 0) {
    return null;
  }

  const pct = coverageShare * 100;
  const severity = severityFromTarget(pct, COPILOT_REVIEW_ADOPTION_PCT, {
    higherIsBetter: true,
    tolerancePct: INSIGHT_THRESHOLDS.targetTolerancePct,
  });
  const onTrack = severity === "positive";

  return {
    action: onTrack
      ? undefined
      : "Extend Copilot code review to more repositories, or request it on changes that need a first pass.",
    category: "adoption",
    confidence: confidenceFromSample(mergedPrs),
    detail: `Copilot reviewed ${copilotReviewedPrs} of the ${mergedPrs} pull requests merged in the period (${formatPercent(coverageShare, 1)}), against a ${COPILOT_REVIEW_ADOPTION_PCT}% adoption baseline.`,
    id: "copilot-review-adoption",
    sampleSize: mergedPrs,
    severity,
    title: onTrack
      ? "Copilot review adoption on track"
      : "Copilot review lightly adopted",
    value: { current: roundPct(pct), unit: "%" },
  };
};

const agentPrInsight = (input: CopilotInsightsInput): Insight | null => {
  const { copilotAuthoredMergedPrs, copilotAuthoredPrs } = input.cards;

  if (copilotAuthoredPrs === 0) {
    return null;
  }

  const mergeRate = share(copilotAuthoredMergedPrs, copilotAuthoredPrs);

  if (mergeRate === null) {
    return null;
  }

  const landing = mergeRate >= 0.5;

  return {
    action: landing
      ? undefined
      : "Review stalled agent pull requests: finish, resubmit, or close them.",
    category: "adoption",
    confidence: confidenceFromSample(copilotAuthoredPrs),
    detail: `The Copilot coding agent opened ${copilotAuthoredPrs} pull requests in the period; ${copilotAuthoredMergedPrs} have been merged (${formatPercent(mergeRate)}).`,
    id: "copilot-agent-pr-outcome",
    sampleSize: copilotAuthoredPrs,
    severity: landing ? "positive" : "warning",
    title: landing
      ? "Most agent pull requests land"
      : "Agent pull requests stall",
    value: { current: roundPct(mergeRate * 100), unit: "%" },
  };
};

const pairingInsight = (input: CopilotInsightsInput): Insight | null => {
  const { copilotAndHuman, copilotOnly } = input.reviewCombination;
  const reviewedMerges = copilotAndHuman + copilotOnly;

  if (reviewedMerges === 0) {
    return null;
  }

  const pairedShare = share(copilotAndHuman, reviewedMerges);

  if (pairedShare === null) {
    return null;
  }

  const paired = pairedShare >= 0.8;

  return {
    action: paired
      ? undefined
      : "Check the pull requests merged with a Copilot review only: a Copilot comment is not an approval.",
    category: "quality",
    confidence: confidenceFromSample(reviewedMerges),
    detail: `${copilotAndHuman} of the ${reviewedMerges} merged pull requests carrying a Copilot review also received a human review${copilotOnly > 0 ? `; ${copilotOnly} were merged with a Copilot review only` : ""}.`,
    id: "copilot-review-pairing",
    sampleSize: reviewedMerges,
    severity: paired ? "positive" : "warning",
    title: paired
      ? "Copilot complements human review"
      : "Some merges rely on Copilot alone",
    value: { current: roundPct(pairedShare * 100), unit: "%" },
  };
};

const leadTimeInsight = (input: CopilotInsightsInput): Insight | null => {
  const { avgLeadTimeHoursWith, avgLeadTimeHoursWithout } = input.cards;

  if (avgLeadTimeHoursWith === null || avgLeadTimeHoursWithout === null) {
    return null;
  }

  return {
    category: "velocity",
    detail: `Pull requests with a Copilot review took ${formatNumber(avgLeadTimeHoursWith)}h from open to merge on average, versus ${formatNumber(avgLeadTimeHoursWithout)}h without one. This is a correlation, not a causal effect: Copilot is more likely to review large or risky changes, which take longer anyway.`,
    id: "copilot-review-lead-time",
    severity: "neutral",
    title: "Copilot-led review and lead time",
    value: {
      current: avgLeadTimeHoursWith,
      label: "with Copilot review",
      unit: "hours",
    },
  };
};

/** Builds the ordered list of insights for the Copilot dashboard. */
export const buildCopilotInsights = (input: CopilotInsightsInput): Insight[] =>
  sortInsights(
    [
      adoptionInsight(input),
      pairingInsight(input),
      agentPrInsight(input),
      leadTimeInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
