/**
 * Tooltip content for DX Adoption dashboard
 */

export const dxAdoptionTooltips = {
  moduleAdoption:
    "Percentage of DX vs standard Terraform modules. Shows infrastructure standardization.",
  modulesList:
    "Terraform modules available. Enables self-service infrastructure automation.",
  outdatedModules:
    "Count of modules with available updates. Indicates technical debt.",
  pipelineAdoption:
    "Percentage of DX vs standard pipelines. Indicates team adoption of standardized CI/CD.",
  title:
    "Measures adoption of Developer Experience initiatives and tools across the organization.",
  unknownVersions:
    "Modules with untracked version status. Reveals visibility gaps in infrastructure.",
  upToDatePercentage:
    "Percentage of modules using latest version. Measures dependency freshness.",
  versionDrift:
    "Module version gaps between actual and latest. Highlights needed updates.",
  workflowsList:
    "All available pipelines and their categorization. Helps teams discover DX tools.",
} as const;
