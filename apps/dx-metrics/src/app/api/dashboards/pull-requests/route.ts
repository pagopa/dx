// Pull request dashboard API route — thin adapter delegating to the domain layer.
import { NextRequest, NextResponse } from "next/server";

import { getPrLeadTimeBenchmark } from "@/adapters/db/benchmark/queries";
import { fetchPrDashboard } from "@/adapters/db/pull-requests/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { ORGANIZATION, REPOSITORIES } from "@/lib/config";
import { parseDashboardQuery, resolveRepositories } from "@/lib/query-params";
import { percentileRank } from "@/lib/stats";

/** Peer comparison shape consumed by the pull-request insights. */
type PeerBenchmark = {
  leadTimeMedian: null | number;
  peerCount: number;
  percentileRank: null | number;
};

/**
 * Builds the peer comparison for the selected repositories.
 *
 * With one repository selected this is that repository's rank. With several,
 * the group's lead time is the pull-request-count-weighted average of the
 * selected repositories, ranked against the same organisation peers, so the
 * reading stays meaningful for a multi-repository selection.
 */
const buildPeerBenchmark = (
  benchmark: Awaited<ReturnType<typeof getPrLeadTimeBenchmark>> | null,
  repositories: readonly string[],
): PeerBenchmark | undefined => {
  if (benchmark === null) {
    return undefined;
  }

  const selected = new Set(repositories);
  const selectedEntries = benchmark.entries.filter(
    (entry) =>
      selected.has(entry.repository) &&
      entry.value !== null &&
      entry.count !== null &&
      entry.count > 0,
  );

  if (selectedEntries.length === 0) {
    return undefined;
  }

  const totalCount = selectedEntries.reduce(
    (sum, entry) => sum + (entry.count ?? 0),
    0,
  );
  const groupLeadTime =
    selectedEntries.reduce(
      (sum, entry) => sum + (entry.value ?? 0) * (entry.count ?? 0),
      0,
    ) / totalCount;

  const peerValues = benchmark.entries
    .map((entry) => entry.value)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

  return {
    leadTimeMedian: benchmark.median,
    peerCount: peerValues.length,
    percentileRank: percentileRank(groupLeadTime, peerValues),
  };
};

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days } = parsed.query;
  const repositories = resolveRepositories(parsed.query, "dx");
  const fullNames = repositories.map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    // The lead-time benchmark puts the selection's average in the context of
    // its org peers and feeds the peer-comparison insight, so it must be
    // resolved before the dashboard builds its insights. Losing it must not
    // fail the dashboard — insights simply lose the peer reading.
    const leadTimeBenchmark = await getPrLeadTimeBenchmark(db, {
      configuredRepositories: REPOSITORIES,
      days,
    }).catch((benchmarkError) => {
      console.error("PR peer benchmark error:", benchmarkError);
      return null;
    });

    const result = await fetchPrDashboard(db, {
      days,
      fullNames,
      peerBenchmark: buildPeerBenchmark(leadTimeBenchmark, repositories),
    });
    return jsonWithCache(result);
  } catch (error) {
    console.error("PR dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
