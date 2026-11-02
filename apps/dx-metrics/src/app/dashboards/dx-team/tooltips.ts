/**
 * Tooltip content for DX Team dashboard
 */

export const dxTeamTooltips = {
  adoptingProjects:
    "Projects using DX tools and standards. Shows successful adoption patterns.",
  commitsByRepo:
    "DX member contributions across repositories. Reveals team expertise areas.",
  dxMemberCommits:
    "Commits by DX members to non-DX repositories. A negative signal: work that should belong to the teams owning those repositories.",
  dxModules:
    "DX Terraform modules, one row per module, across every imported repository. Module sources are normalised to the registry module name or repository name before grouping; clicking a name searches GitHub for the original, non-normalised source expression (the most-used one when the module was referenced in several ways). Occurrences count declarations (repository + file); Repositories counts distinct repositories using the module. Same DX predicate as the DX Adoption dashboard. Snapshot of the current state: the importer replaces each repository's rows, so there is no history.",
  nonDxModules:
    "Terraform modules outside the DX registry, one row per module, across every imported repository. Module sources are normalised to the registry module name or repository name before grouping; clicking a name searches GitHub for the original, non-normalised source expression (the most-used one when the module was referenced in several ways). Local modules are excluded. Occurrences count declarations (repository + file); Repositories counts distinct repositories using the module. Snapshot of the current state, not of the selected date range.",
  ioInfraPrs:
    "Pull requests to the shared infrastructure repository by author group. External contributions are a positive signal of product teams owning infrastructure.",
  ioInfraPrTable:
    "List of infrastructure PRs authored by team. Tracks infrastructure enhancement efforts.",
  pipelinesUsage:
    "Which DX pipelines are used across projects. Measures tool adoption and utility.",
  title:
    "Analyzes DX team productivity and delivery of developer experience initiatives.",
} as const;
