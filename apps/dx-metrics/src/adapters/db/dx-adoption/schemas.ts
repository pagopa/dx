/** Zod schemas and inferred types for the DX Adoption database adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

export const fetchDxAdoptionInputSchema = z.object({
  fullName: z.string().min(1),
});

export const moduleAdoptionRowSchema = z.object({
  module_count: sqlNumberSchema,
  module_type: z.string().min(1),
});

export const moduleRowSchema = z.object({
  file_path: z.string().min(1),
  module_name: z.string().min(1),
  module_type: z.string().min(1),
});

export const pipelineAdoptionRowSchema = z.object({
  pipeline_count: sqlNumberSchema,
  pipeline_type: z.string().min(1),
});

export const versionDriftRowSchema = z.object({
  drift_status: z.string().min(1),
  file_path: z.string().min(1),
  latest_version: z.string().min(1).nullable(),
  module_name: z.string().min(1),
  used_version: z.string().min(1).nullable(),
});

export const versionDriftSummaryRowSchema = z.object({
  outdated: nullableSqlNumberSchema,
  total: nullableSqlNumberSchema,
  unknown: nullableSqlNumberSchema,
  up_to_date: nullableSqlNumberSchema,
});

export const versionDriftSummarySchema = z.object({
  outdated: sqlNumberSchema,
  total: sqlNumberSchema,
  unknown: sqlNumberSchema,
  upToDate: sqlNumberSchema,
});

export const workflowRowSchema = z.object({
  pipeline_type: z.string().min(1),
  workflow_name: z.string().min(1),
});

export const dxAdoptionResultSchema = z.object({
  moduleAdoption: z.array(moduleAdoptionRowSchema),
  modulesList: z.array(moduleRowSchema),
  pipelineAdoption: z.array(pipelineAdoptionRowSchema),
  versionDriftList: z.array(versionDriftRowSchema),
  versionDriftSummary: versionDriftSummarySchema,
  workflowsList: z.array(workflowRowSchema),
});

export type DxAdoptionResult = z.infer<typeof dxAdoptionResultSchema>;
export type FetchDxAdoptionInput = z.infer<typeof fetchDxAdoptionInputSchema>;
export type ModuleAdoptionRow = z.infer<typeof moduleAdoptionRowSchema>;
export type ModuleRow = z.infer<typeof moduleRowSchema>;
export type PipelineAdoptionRow = z.infer<typeof pipelineAdoptionRowSchema>;
export type VersionDriftRow = z.infer<typeof versionDriftRowSchema>;
export type VersionDriftSummary = z.infer<typeof versionDriftSummarySchema>;
export type WorkflowRow = z.infer<typeof workflowRowSchema>;
