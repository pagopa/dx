/** Shared input schemas for database dashboard adapters. */

import { z } from "zod";

export const dashboardParamsSchema = z.object({
  days: z.number().int().nonnegative(),
  fullName: z.string().min(1),
});

export type DashboardParams = z.infer<typeof dashboardParamsSchema>;
