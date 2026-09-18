/** Deterministic insights for the contributors & ownership dashboard. */

import { INSIGHT_THRESHOLDS } from "@/lib/config";
import { share } from "@/lib/stats";

import {
  confidenceFromSample,
  formatPercent,
  severityFromUpperThreshold,
  sortInsights,
} from "./insight-helpers";
import type { Insight } from "./types";

export interface ContributorsInsightsInput {
  readonly mergers: readonly {
    readonly login: string;
    readonly merges: number;
    readonly share: number;
  }[];
  readonly ownershipByRepo: readonly {
    readonly repository: string;
    readonly topAuthor: string;
    readonly topAuthorCommits: number;
    readonly topAuthorShare: number;
    readonly totalCommits: number;
  }[];
  readonly summary: {
    readonly mergedPrCount: number;
    readonly topContributorShare: number;
    readonly topMergerShare: number;
    readonly totalCommits: number;
  };
}

/**
 * Draws attention to merge rights concentrated on a single person.
 *
 * The threshold is an upper bound: below it merge rights are spread widely
 * enough that one absence cannot stall delivery, above it the dashboard frames
 * the concentration as a delivery risk rather than a personal ranking.
 */
const mergeBusFactorInsight = (
  input: ContributorsInsightsInput,
): Insight | null => {
  const totalMerges = input.mergers.reduce(
    (sum, merger) => sum + merger.merges,
    0,
  );
  const top = [...input.mergers].sort(
    (left, right) =>
      right.merges - left.merges || left.login.localeCompare(right.login),
  )[0];

  if (top === undefined || totalMerges === 0) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    input.summary.topMergerShare,
    INSIGHT_THRESHOLDS.mergeBusFactorShare,
  );

  return {
    action:
      "Spend merge rights wider so one person's absence cannot stall merges.",
    category: "risk",
    confidence: confidenceFromSample(totalMerges),
    detail: `${top.login} performed ${formatPercent(input.summary.topMergerShare)} of the ${totalMerges} merges in the period.`,
    id: "merge-bus-factor",
    severity,
    title:
      severity === "positive"
        ? "Merge rights well distributed"
        : "Merge rights concentrated on one person",
    value: { current: input.summary.topMergerShare * 100, unit: "%" },
  };
};

/**
 * Reports how many repositories depend on a single commit author for most of
 * their code. Ownership concentration is a continuity risk, not a comment on
 * the author.
 */
const ownershipBusFactorInsight = (
  input: ContributorsInsightsInput,
): Insight | null => {
  if (input.ownershipByRepo.length === 0) {
    return null;
  }

  const concentrated = input.ownershipByRepo.filter(
    (repository) =>
      repository.topAuthorShare > INSIGHT_THRESHOLDS.teamBusFactorShare,
  );
  const concentratedShare = share(
    concentrated.length,
    input.ownershipByRepo.length,
  );

  if (concentratedShare === null) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    concentratedShare,
    INSIGHT_THRESHOLDS.teamBusFactorShare,
  );

  return {
    action:
      severity === "positive"
        ? undefined
        : "Pair more authors on the repositories whose code is owned by a single person.",
    category: "risk",
    confidence: confidenceFromSample(input.ownershipByRepo.length),
    detail: `${formatPercent(concentratedShare)} of repositories (${concentrated.length}/${input.ownershipByRepo.length}) have a single author responsible for more than ${formatPercent(INSIGHT_THRESHOLDS.teamBusFactorShare)} of their commits.`,
    id: "ownership-bus-factor",
    severity,
    title:
      severity === "positive"
        ? "Code ownership spread across authors"
        : "Code ownership concentrated on one person",
    value: { current: concentratedShare * 100, unit: "%" },
  };
};

/**
 * Reports authoring load concentrated on one person. This measures how much of
 * the merged work flows through a single author, which is a continuity risk,
 * not a performance ranking.
 */
const contributorConcentrationInsight = (
  input: ContributorsInsightsInput,
): Insight | null => {
  if (input.summary.mergedPrCount === 0) {
    return null;
  }

  const severity = severityFromUpperThreshold(
    input.summary.topContributorShare,
    INSIGHT_THRESHOLDS.teamBusFactorShare,
  );
  const concentrated = severity !== "positive";

  return {
    action: concentrated
      ? "Distribute authoring and review load so no single person is on the critical path."
      : undefined,
    category: "risk",
    confidence: confidenceFromSample(input.summary.mergedPrCount),
    detail: `The busiest author accounts for ${formatPercent(input.summary.topContributorShare)} of the ${input.summary.mergedPrCount} merged pull requests in the period.`,
    id: "contributor-concentration",
    severity,
    title: concentrated
      ? "Authoring load concentrated on one person"
      : "Authoring load well distributed",
    value: { current: input.summary.topContributorShare * 100, unit: "%" },
  };
};

/** Builds the ordered list of insights for the contributors dashboard. */
export const buildContributorsInsights = (
  input: ContributorsInsightsInput,
): Insight[] =>
  sortInsights(
    [
      mergeBusFactorInsight(input),
      ownershipBusFactorInsight(input),
      contributorConcentrationInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
