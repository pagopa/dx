/** Types for the Techradar dashboard domain module. */

import type { TechRadarDashboardData } from "@/lib/tech-radar-dashboard";

/** The result shape returned by the techradar dashboard query. */
export type TechRadarDashboardResult = TechRadarDashboardData;

/** Parameters specific to the techradar dashboard query. */
export interface TechRadarParams {
  readonly configuredRepositories: readonly string[];
}
