// Pull request dashboard API route — thin adapter delegating to the domain layer.
import { NextRequest, NextResponse } from "next/server";

import { getPrLeadTimeBenchmark } from "@/adapters/db/benchmark/queries";
import { fetchPrDashboard } from "@/adapters/db/pull-requests/queries";
import { db } from "@/db/instance";
import { jsonWithCache } from "@/lib/api-cache";
import { ORGANIZATION, REPOSITORIES } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";

export async function GET(req: NextRequest) {
  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const { days, repository = "dx" } = parsed.query;
  const fullName = `${ORGANIZATION}/${repository}`;

  try {
    // The lead-time benchmark puts this repository's average in the context of
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

    const peerEntry = leadTimeBenchmark?.entries.find(
      (entry) => entry.repository === repository,
    );
    const peerBenchmark =
      peerEntry && leadTimeBenchmark
        ? {
            leadTimeMedian: leadTimeBenchmark.median,
            peerCount: leadTimeBenchmark.entries.filter(
              (entry) => entry.value !== null,
            ).length,
            percentileRank: peerEntry.percentileRank,
          }
        : undefined;

    const result = await fetchPrDashboard(db, {
      days,
      fullName,
      peerBenchmark,
    });
    return jsonWithCache(result);
  } catch (error) {
    console.error("PR dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
