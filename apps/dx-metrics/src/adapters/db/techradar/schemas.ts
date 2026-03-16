/** Zod schemas and inferred types for the Techradar database adapter. */

import { z } from "zod";

export const getTechRadarDashboardInputSchema = z.object({
  configuredRepositories: z.array(z.string().min(1)),
});

export const techRadarUsageRowSchema = z.object({
  evidencePath: z.string().min(1).nullable(),
  radarRef: z.string().min(1).nullable(),
  radarRing: z.string().min(1).nullable(),
  radarSlug: z.string().min(1).nullable(),
  radarStatus: z.string().min(1),
  radarTitle: z.string().min(1).nullable(),
  repositoryFullName: z.string().min(1),
  toolKey: z.string().min(1),
  toolName: z.string().min(1),
});

export const adoptionByToolRowSchema = z.object({
  adoption_percentage: z.number().finite(),
  radar_ref: z.string().min(1).nullable(),
  radar_ring: z.string().min(1).nullable(),
  radar_slug: z.string().min(1).nullable(),
  radar_status: z.string().min(1),
  radar_title: z.string().min(1).nullable(),
  repository_count: z.number().int().nonnegative(),
  tool_key: z.string().min(1),
  tool_name: z.string().min(1),
});

export const repositoryCoverageRowSchema = z.object({
  aligned_tools: z.number().int().nonnegative(),
  detected_tools: z.number().int().nonnegative(),
  repository: z.string().min(1),
});

export const repositoryMatrixRowSchema = z.object({
  evidence_path: z.string().min(1).nullable(),
  radar_ref: z.string().min(1).nullable(),
  radar_ring: z.string().min(1).nullable(),
  radar_status: z.string().min(1),
  radar_status_label: z.string().min(1),
  radar_title: z.string().min(1).nullable(),
  repository: z.string().min(1),
  tool_name: z.string().min(1),
});

export const statusDistributionRowSchema = z.object({
  name: z.string().min(1),
  value: z.number().int().nonnegative(),
});

export const techRadarSummarySchema = z.object({
  aligned_usages: z.number().int().nonnegative(),
  detected_usages: z.number().int().nonnegative(),
  repositories_total: z.number().int().nonnegative(),
  repositories_with_detected_tools: z.number().int().nonnegative(),
  tools_detected: z.number().int().nonnegative(),
  usages_not_in_radar: z.number().int().nonnegative(),
});

export const techRadarDashboardResultSchema = z.object({
  adoptionByTool: z.array(adoptionByToolRowSchema),
  repositoriesWithoutDetectedTools: z.array(z.string().min(1)),
  repositoryCoverage: z.array(repositoryCoverageRowSchema),
  repositoryMatrix: z.array(repositoryMatrixRowSchema),
  statusDistribution: z.array(statusDistributionRowSchema),
  summary: techRadarSummarySchema,
});

export type AdoptionByToolRow = z.infer<typeof adoptionByToolRowSchema>;
export type GetTechRadarDashboardInput = z.infer<
  typeof getTechRadarDashboardInputSchema
>;
export type RepositoryCoverageRow = z.infer<typeof repositoryCoverageRowSchema>;
export type RepositoryMatrixRow = z.infer<typeof repositoryMatrixRowSchema>;
export type StatusDistributionRow = z.infer<typeof statusDistributionRowSchema>;
export type TechRadarDashboardResult = z.infer<
  typeof techRadarDashboardResultSchema
>;
export type TechRadarSummary = z.infer<typeof techRadarSummarySchema>;
export type TechRadarUsageRow = z.infer<typeof techRadarUsageRowSchema>;
