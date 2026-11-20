/** Zod schemas and inferred types for the DX Team database adapter. */

import { z } from "zod";

import {
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const fetchDxTeamDashboardInputSchema = z.object({
  days: z.number().int().nonnegative(),
  /** End of the custom range (`YYYY-MM-DD`), inclusive. */
  end: z.string().optional(),
  organization: z.string().min(1),
  /** Start of the custom range (`YYYY-MM-DD`), inclusive. */
  start: z.string().optional(),
});

export const commitsByRepoRowSchema = z.object({
  fullName: z.string().min(1),
  memberName: z.string().min(1),
  repositoryCommits: sqlNumberSchema,
});

export const dxAdoptingProjectRowSchema = z.object({
  repository: z.string().min(1),
});

export const dxCommitRowSchema = z.object({
  committerDate: sqlDateSchema,
  memberName: z.string().min(1),
  repositoryCommits: sqlNumberSchema,
});

export const dxPipelinesUsageRowSchema = z.object({
  dxPath: z.string().min(1),
  repositoryCount: sqlNumberSchema,
});

export const ioInfraPrRowSchema = z.object({
  date: sqlDateSchema,
  dxPr: sqlNumberSchema,
  nonDxPr: sqlNumberSchema,
});

export const ioInfraPrTableRowSchema = z.object({
  author: z.string().min(1),
  createdAt: sqlTimestampSchema,
});

/** One module declaration as returned by the source scan. */
export const terraformModuleDeclarationRowSchema = z.object({
  module: z.string().min(1),
  repository: z.string().min(1),
});

/** One module and how widely it is used across the imported repositories. */
export const terraformModuleRowSchema = z.object({
  module: z.string().min(1),
  moduleType: z.enum(["DX", "Non-DX"]),
  repositoryCount: sqlNumberSchema,
  /** Non-normalised sources used to build the GitHub search link. */
  sources: z.array(z.string().min(1)),
  usageCount: sqlNumberSchema,
});

export const dxTeamDashboardResultSchema = z.object({
  commitsByRepo: z.array(commitsByRepoRowSchema),
  dxAdoptingProjects: z.array(dxAdoptingProjectRowSchema),
  dxCommits: z.array(dxCommitRowSchema),
  dxPipelinesUsage: z.array(dxPipelinesUsageRowSchema),
  ioInfraPrs: z.array(ioInfraPrRowSchema),
  ioInfraPrTable: z.array(ioInfraPrTableRowSchema),
  terraformModules: z.array(terraformModuleRowSchema),
});

export type CommitsByRepoRow = z.infer<typeof commitsByRepoRowSchema>;
export type DxAdoptingProjectRow = z.infer<typeof dxAdoptingProjectRowSchema>;
export type DxCommitRow = z.infer<typeof dxCommitRowSchema>;
export type DxPipelinesUsageRow = z.infer<typeof dxPipelinesUsageRowSchema>;
export type DxTeamDashboardResult = z.infer<typeof dxTeamDashboardResultSchema>;
export type FetchDxTeamDashboardInput = z.infer<
  typeof fetchDxTeamDashboardInputSchema
>;
export type IoInfraPrRow = z.infer<typeof ioInfraPrRowSchema>;
export type IoInfraPrTableRow = z.infer<typeof ioInfraPrTableRowSchema>;
