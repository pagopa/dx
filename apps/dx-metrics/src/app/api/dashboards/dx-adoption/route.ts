/** Route handler for the DX Adoption dashboard (thin adapter). */
import { NextRequest, NextResponse } from "next/server";

import { fetchDxAdoption } from "@/adapters/db/dx-adoption/queries";
import { db } from "@/db/instance";
import { jsonWithNoStore } from "@/lib/api-cache";
import { ORGANIZATION } from "@/lib/config";
import { parseDashboardQuery } from "@/lib/query-params";
import { resolveVisibleRepositories } from "@/lib/scope/scope";
import { requireScope } from "@/lib/scope/server";

export async function GET(req: NextRequest) {
  const auth = requireScope(req);
  if ("error" in auth) return auth.error;

  const parsed = parseDashboardQuery(req);
  if ("error" in parsed) return parsed.error;
  const fullNames = resolveVisibleRepositories(parsed.query, auth.scope).map(
    (repository) => `${ORGANIZATION}/${repository}`,
  );

  try {
    const result = await fetchDxAdoption(db, { fullNames });
    return jsonWithNoStore(result);
  } catch (error) {
    console.error("DX Adoption dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
