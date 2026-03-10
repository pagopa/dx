/**
 * Tooltip content for Releases dashboard
 */

export const releasestooltips = {
  title:
    "Tracks Terraform module versioning and release cadence for infrastructure standardization.",
  totalModules: "Count of published Terraform modules. Measures DX infrastructure library size.",
  totalMajorVersions:
    "Total major versions across all modules. Indicates version complexity.",
  totalReleases: "Total releases published. Shows maintenance activity and update frequency.",
  oldestRelease: "Date of first module release. Indicates how long DX infrastructure has been published.",
  newestRelease: "Date of latest release. Shows if modules are actively maintained.",
  majorVersionsTrend:
    "Monthly trend of new major versions. Identifies update frequency and compatibility impacts.",
  moduleCatalog:
    "Complete module listing with version history. Enables module discovery and update tracking.",
  firstReleaseDate: "When module was first published. Indicates module maturity.",
  lastReleaseDate: "Most recent update date. Shows if module is actively maintained.",
  versionHistory:
    "All version releases for a module. Helps plan upgrades and track changes.",
} as const;
