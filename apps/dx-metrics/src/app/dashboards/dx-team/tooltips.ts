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
  ioInfraPrs:
    "Pull requests to the shared infrastructure repository by author group. External contributions are a positive signal of product teams owning infrastructure.",
  ioInfraPrTable:
    "List of infrastructure PRs authored by team. Tracks infrastructure enhancement efforts.",
  pipelinesUsage:
    "Which DX pipelines are used across projects. Measures tool adoption and utility.",
  title:
    "Analyzes DX team productivity and delivery of developer experience initiatives.",
} as const;
