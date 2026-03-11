/**
 * Tooltip content for Techradar dashboard
 */

export const techradarTooltips = {
  adoptionByTool:
    "Shows how many configured repositories use each discoverable tool and the relative adoption percentage.",
  detectedUsages:
    "Total number of detected repository/tool matches imported through GitHub code search.",
  repositoriesAnalysed:
    "Total number of configured repositories included in the Techradar analysis scope.",
  repositoriesWithDetectedTools:
    "Number of configured repositories where at least one discoverable Techradar tool was found.",
  repositoryCoverage:
    "Highlights how many discoverable tools were found in each configured repository.",
  repositoryMatrix:
    "Detailed repository-to-tool mapping with evidence path and radar metadata for auditability.",
  statusDistribution:
    "Distribution of detected tools across Technology Radar rings, plus tools that are not currently present in the radar.",
  title:
    "Tracks discoverable tool adoption across configured repositories and relates it to the DX Technology Radar.",
  toolsDetected:
    "Unique discoverable tools found in the configured repository set.",
  usagesNotInRadar:
    "Detected tools that are intentionally shown even though they are not currently modeled in the Technology Radar.",
} as const;
