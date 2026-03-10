/**
 * Tooltip content for DX Adoption dashboard
 */

export const dxAdoptionTooltips = {
  title:
    "Measures adoption of Developer Experience initiatives and tools across the organization.",
  pipelineAdoption:
    "Percentage of DX vs standard pipelines. Indicates team adoption of standardized CI/CD.",
  moduleAdoption:
    "Percentage of DX vs standard Terraform modules. Shows infrastructure standardization.",
  workflowsList: "All available pipelines and their categorization. Helps teams discover DX tools.",
  modulesList: "Terraform modules available. Enables self-service infrastructure automation.",
  upToDatePercentage:
    "Percentage of modules using latest version. Measures dependency freshness.",
  outdatedModules: "Count of modules with available updates. Indicates technical debt.",
  unknownVersions:
    "Modules with untracked version status. Reveals visibility gaps in infrastructure.",
  versionDrift:
    "Module version gaps between actual and latest. Highlights needed updates.",
} as const;
