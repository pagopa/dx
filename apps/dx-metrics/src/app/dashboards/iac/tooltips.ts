/**
 * Tooltip content for IaC (Infrastructure as Code) dashboard
 */

export const iacTooltips = {
  avgLeadTimeDays:
    "Average time to merge infrastructure changes. Critical for infrastructure update speed.",
  leadTimeMovingAvg:
    "Weekly average PR lead time for infrastructure changes. Shows governance process speed.",
  leadTimeTrend:
    "Lead time trend for IaC PRs. Indicates if infrastructure reviews are getting faster.",
  mergedPrs:
    "Approved and merged IaC PRs. Measures completed infrastructure changes.",
  prsByReviewer:
    "Infrastructure PRs handled by each reviewer. Shows expertise distribution and workload.",
  prsOverTime:
    "Count of IaC PRs by week. Measures infrastructure change frequency and update velocity.",
  supervisedVsUnsupervised:
    "Cumulative count of supervised vs unsupervised IaC PRs. Unsupervised means product teams own their infrastructure changes (the goal); heavy DX supervision means the team is implementing instead of enabling.",
  title:
    "Tracks Infrastructure as Code pull request metrics to ensure configuration changes are properly reviewed.",
} as const;
