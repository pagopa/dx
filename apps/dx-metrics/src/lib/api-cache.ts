/** Shared cache headers for dashboard API routes. */

import { NextResponse } from "next/server";

/**
 * Dashboard payloads are scoped per visitor, so they must never enter a shared
 * cache: a `public` response is keyed by URL alone and a proxy would hand one
 * scope's payload to another visitor. `private, no-store` keeps every copy out
 * of every cache; `useDashboardData` still keeps its own short-lived in-memory
 * cache on the client.
 */
export const DASHBOARD_CACHE_CONTROL = "private, no-store";

/** Builds a JSON response carrying the dashboard no-store policy. */
export const jsonWithNoStore = <TPayload>(payload: TPayload) =>
  NextResponse.json(payload, {
    headers: { "Cache-Control": DASHBOARD_CACHE_CONTROL },
  });
