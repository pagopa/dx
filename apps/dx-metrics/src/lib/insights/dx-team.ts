/** Deterministic insights for the DX Team dashboard. */

import { INSIGHT_THRESHOLDS } from "@/lib/config";
import { share } from "@/lib/stats";

import { formatPercent, sortInsights } from "./insight-helpers";
import type { Insight } from "./types";

export interface DxTeamInsightsInput {
  readonly commitsByRepo: readonly {
    readonly fullName: string;
    readonly memberName: string;
    readonly repositoryCommits: number;
  }[];
  readonly dxPipelinesUsage: readonly {
    readonly dxPath: string;
    readonly repositoryCount: number;
  }[];
  readonly ioInfraPrs: readonly {
    readonly dxPr: number;
    readonly nonDxPr: number;
  }[];
}

const ioInfraExternalInsight = (input: DxTeamInsightsInput): Insight | null => {
  const { dx, nonDx } = input.ioInfraPrs.reduce(
    (accumulator, row) => ({
      dx: accumulator.dx + row.dxPr,
      nonDx: accumulator.nonDx + row.nonDxPr,
    }),
    { dx: 0, nonDx: 0 },
  );

  const total = dx + nonDx;

  if (total === 0) {
    return null;
  }

  const externalShare = share(nonDx, total);

  if (externalShare === null) {
    return null;
  }

  return {
    category: "velocity",
    detail: `${formatPercent(externalShare)} of io-infra pull requests come from outside the DX team (${nonDx}/${total}).`,
    id: "dx-team-io-infra-external",
    severity: "positive",
    title: "Product teams contribute to io-infra",
    value: { current: externalShare * 100, unit: "%" },
  };
};

const busFactorInsight = (input: DxTeamInsightsInput): Insight | null => {
  const byMember = new Map<string, number>();

  for (const row of input.commitsByRepo) {
    byMember.set(
      row.memberName,
      (byMember.get(row.memberName) ?? 0) + row.repositoryCommits,
    );
  }

  const total = [...byMember.values()].reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return null;
  }

  const top = [...byMember.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];

  if (top === undefined) {
    return null;
  }

  const topShare = share(top[1], total);

  if (topShare === null) {
    return null;
  }

  const concentrated = topShare > INSIGHT_THRESHOLDS.teamBusFactorShare;

  // DX commits on non-DX repositories are a negative signal: the team is doing
  // work that should belong to the owning teams. Keep this neutral at best,
  // even when not concentrated, so it never reads as a positive.
  return {
    action: concentrated
      ? "Spread work on non-DX repositories across more team members."
      : "Shift non-DX work back to the teams that own those repositories.",
    category: "risk",
    detail: `${top[0]} accounts for ${formatPercent(topShare)} of the ${total} DX commits on non-DX repositories.`,
    id: "dx-team-bus-factor",
    severity: concentrated ? "warning" : "neutral",
    title: concentrated
      ? "DX work concentrated on one person"
      : "DX commits on non-DX repositories",
    value: { current: topShare * 100, unit: "%" },
  };
};

const pipelineUsageInsight = (input: DxTeamInsightsInput): Insight | null => {
  if (input.dxPipelinesUsage.length === 0) {
    return null;
  }

  const top = [...input.dxPipelinesUsage].sort(
    (left, right) => right.repositoryCount - left.repositoryCount,
  )[0];

  if (top === undefined) {
    return null;
  }

  return {
    category: "adoption",
    detail: `The most used DX workflow is "${top.dxPath}" (${top.repositoryCount} repositories).`,
    id: "dx-team-pipeline-usage",
    severity: "neutral",
    title: "Most adopted DX workflow",
    value: { current: top.repositoryCount, unit: "repos" },
  };
};

/** Builds the ordered list of insights for the DX Team dashboard. */
export const buildDxTeamInsights = (input: DxTeamInsightsInput): Insight[] =>
  sortInsights(
    [
      ioInfraExternalInsight(input),
      busFactorInsight(input),
      pipelineUsageInsight(input),
    ].filter((insight): insight is Insight => insight !== null),
  );
