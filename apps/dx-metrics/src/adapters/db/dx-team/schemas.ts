/** Zod schemas and inferred types for the DX Team database adapter. */

import { z } from "zod";

import {
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "../shared/sql-parsing";

export const fetchDxTeamDashboardInputSchema = z.object({
  days: z.number().int().nonnegative(),
  organization: z.string().min(1),
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

export const dxTeamDashboardResultSchema = z.object({
  commitsByRepo: z.array(commitsByRepoRowSchema),
  dxAdoptingProjects: z.array(dxAdoptingProjectRowSchema),
  dxCommits: z.array(dxCommitRowSchema),
  dxPipelinesUsage: z.array(dxPipelinesUsageRowSchema),
  ioInfraPrs: z.array(ioInfraPrRowSchema),
  ioInfraPrTable: z.array(ioInfraPrTableRowSchema),
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
