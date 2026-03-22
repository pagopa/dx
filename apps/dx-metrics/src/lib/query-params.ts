// Shared Zod schemas for validating API route query parameters.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const DashboardQuerySchema = z.object({
  days: z.coerce.number().int().positive().default(120),
  repository: z.string().min(1).optional(),
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

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
