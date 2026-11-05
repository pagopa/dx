// Shared Zod schemas for validating API route query parameters.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isCalendarDate } from "@/lib/date-range";

/**
 * Comma-separated repository list. The parameter is optional so an absent value
 * can fall back to the route's default, while an explicitly empty value
 * (`repositories=`) parses to `[]` — an empty selection, which the queries turn
 * into empty results rather than "all repositories".
 */
const repositoriesParam = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined
      ? undefined
      : value
          .split(",")
          .map((repository) => repository.trim())
          .filter((repository) => repository.length > 0),
  );

/**
 * Calendar date (`YYYY-MM-DD`) used by the custom range. An absent value means
 * "fall back to the trailing `days` window", so every existing bookmark keeps
 * working.
 */
const calendarDateParam = z
  .string()
  .refine(isCalendarDate, "Expected a YYYY-MM-DD calendar date")
  .optional();

export const DashboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().default(120),
  /** End of the custom range, inclusive. Requires `start` to take effect. */
  end: calendarDateParam,
  /** @deprecated Single-repository alias kept for existing bookmarks. */
  repository: z.string().min(1).optional(),
  repositories: repositoriesParam,
  /** Start of the custom range, inclusive. Takes precedence over `days`. */
  start: calendarDateParam,
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

/**
 * Resolves the requested repositories, preserving the three-way distinction
 * between "not provided" (the default selection), "single legacy value" and
 * "explicitly empty" (empty results).
 */
export function resolveRepositories(
  query: DashboardQuery,
  defaultRepositories: readonly string[],
): string[] {
  if (query.repositories !== undefined) {
    return query.repositories;
  }

  if (query.repository !== undefined) {
    return [query.repository];
  }

  return [...defaultRepositories];
}

/**
 * Parses and validates dashboard query parameters from the request URL.
 * Returns `{ query }` on success or `{ error }` with a 400 response on failure.
 */
export function parseDashboardQuery(
  req: NextRequest,
): { error: NextResponse } | { query: DashboardQuery } {
  const result = DashboardQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!result.success) {
    return {
      error: NextResponse.json(
        { details: result.error.flatten(), error: "Invalid query parameters" },
        { status: 400 },
      ),
    };
  }
  return { query: result.data };
}
