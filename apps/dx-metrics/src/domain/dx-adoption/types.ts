/** Types for the DX Adoption dashboard result. */

export interface DxAdoptionResult {
  readonly moduleAdoption: readonly ModuleAdoptionRow[];
  readonly modulesList: readonly ModuleRow[];
  readonly pipelineAdoption: readonly PipelineAdoptionRow[];
  readonly versionDriftList: readonly VersionDriftRow[];
  readonly versionDriftSummary: VersionDriftSummary;
  readonly workflowsList: readonly WorkflowRow[];
}

export interface ModuleAdoptionRow {
  readonly module_count: number;
  readonly module_type: string;
}

export interface ModuleRow {
  readonly file_path: string;
  readonly module_name: string;
  readonly module_type: string;
}

export interface PipelineAdoptionRow {
  readonly pipeline_count: number;
  readonly pipeline_type: string;
}

export interface VersionDriftRow {
  readonly drift_status: string;
  readonly file_path: string;
  readonly latest_version: null | string;
  readonly module_name: string;
  readonly used_version: null | string;
}

export interface VersionDriftSummary {
  readonly outdated: number;
  readonly total: number;
  readonly unknown: number;
  readonly upToDate: number;
}

export interface WorkflowRow {
  readonly pipeline_type: string;
  readonly workflow_name: string;
}
