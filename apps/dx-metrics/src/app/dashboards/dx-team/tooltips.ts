/**
 * Tooltip content for DX Team dashboard
 */

export const dxTeamTooltips = {
  title:
    "Analyzes DX team productivity and delivery of developer experience initiatives.",
  ioInfraPrs:
    "Pull requests to infrastructure repo by team. Shows DX team's infrastructure contribution.",
  dxMemberCommits:
    "Commits by DX members to non-DX repositories. Measures team's cross-domain impact.",
  ioInfraPrTable:
    "List of infrastructure PRs authored by team. Tracks infrastructure enhancement efforts.",
  commitsByRepo:
    "DX member contributions across repositories. Reveals team expertise areas.",
  adoptingProjects: "Projects using DX tools and standards. Shows successful adoption patterns.",
  pipelinesUsage: "Which DX pipelines are used across projects. Measures tool adoption and utility.",
} as const;
