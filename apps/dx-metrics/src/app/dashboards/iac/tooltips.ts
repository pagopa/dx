/**
 * Tooltip content for IaC (Infrastructure as Code) dashboard
 */

export const iacTooltips = {
  title:
    "Tracks Infrastructure as Code pull request metrics to ensure configuration changes are properly reviewed.",
  leadTimeMovingAvg:
    "Weekly average PR lead time for infrastructure changes. Shows governance process speed.",
  leadTimeTrend:
    "Lead time trend for IaC PRs. Indicates if infrastructure reviews are getting faster.",
  supervisedVsUnsupervised:
    "Cumulative count of supervised vs unsupervised IaC PRs. Tracks governance compliance.",
  prsOverTime: "Count of IaC PRs by week. Measures infrastructure change frequency and update velocity.",
  prsByReviewer:
    "Infrastructure PRs handled by each reviewer. Shows expertise distribution and workload.",
  mergedPrs: "Approved and merged IaC PRs. Measures completed infrastructure changes.",
  avgLeadTimeDays:
    "Average time to merge infrastructure changes. Critical for infrastructure update speed.",
} as const;
