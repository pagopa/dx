/** Shared cache headers for dashboard API routes. */

import { NextResponse } from "next/server";

/**
 * Dashboard data is refreshed by the importer, not per request, so responses
 * can be cached for a short window. `stale-while-revalidate` keeps the UI fast
 * while a fresh copy is fetched in the background.
 */
export const DASHBOARD_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=600";

/** Builds a JSON response carrying the shared dashboard cache policy. */
export const jsonWithCache = <TPayload>(payload: TPayload) =>
  NextResponse.json(payload, {
    headers: { "Cache-Control": DASHBOARD_CACHE_CONTROL },
  });
