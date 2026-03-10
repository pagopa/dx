/**
 * Tooltip content for Releases dashboard
 */

export const releasestooltips = {
  firstReleaseDate:
    "When module was first published. Indicates module maturity.",
  lastReleaseDate:
    "Most recent update date. Shows if module is actively maintained.",
  majorVersionsTrend:
    "Monthly trend of new major versions. Identifies update frequency and compatibility impacts.",
  moduleCatalog:
    "Complete module listing with version history. Enables module discovery and update tracking.",
  newestRelease:
    "Date of latest release. Shows if modules are actively maintained.",
  oldestRelease:
    "Date of first module release. Indicates how long DX infrastructure has been published.",
  title:
    "Tracks Terraform module versioning and release cadence for infrastructure standardization.",
  totalMajorVersions:
    "Total major versions across all modules. Indicates version complexity.",
  totalModules:
    "Count of published Terraform modules. Measures DX infrastructure library size.",
  totalReleases:
    "Total releases published. Shows maintenance activity and update frequency.",
  versionHistory:
    "All version releases for a module. Helps plan upgrades and track changes.",
} as const;
