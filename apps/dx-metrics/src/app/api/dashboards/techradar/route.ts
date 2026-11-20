/** Route adapter — serves the aggregated Techradar dashboard payload. */

import { NextRequest, NextResponse } from "next/server";

import { getTechRadarDashboard } from "@/adapters/db/techradar/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  const configuredRepositories = auth.scope.repositories.map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const data = await getTechRadarDashboard(db, {
      configuredRepositories,
      // The trend has no repository dimension: only the full portfolio may see
      // it, or it would publish exactly what a narrowed scope hides.
      includeUsageTrend: auth.scope.all,
    });
    return jsonWithNoStore(data);
  } catch (error) {
    console.error("Techradar dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
