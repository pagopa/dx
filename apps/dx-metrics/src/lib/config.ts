/** Portal-specific DX Metrics configuration derived from the shared core package. */

import { dxMetricsConfig } from "@pagopa/dx-metrics-core/config";

export const ORGANIZATION: string = dxMetricsConfig.organization;
/**
 * Configured repositories, sorted alphabetically so a long list is easy to
 * scan in the filter. The configured order is kept separately to pick the
 * default repository, which must not change when the list is re-sorted.
 */
const configuredRepositories: readonly string[] = dxMetricsConfig.repositories;
export const REPOSITORIES: string[] = [...configuredRepositories].sort((a, b) =>
  a.localeCompare(b),
);
export const DEFAULT_REPOSITORY = configuredRepositories[0] ?? "dx";
export const DX_TEAM_SLUG: string = dxMetricsConfig.dxTeamSlug;
export const DX_REPO: string = dxMetricsConfig.dxRepo;

export const BOT_AUTHORS = ["renovate-pagopa", "dependabot", "dx-pagopa-bot"];

/**
 * Reviewer login GitHub attaches to Copilot code review. It ends with `[bot]`,
 * so the shared bot exclusion keeps it out of every human-review metric; the
 * Copilot dashboard matches it explicitly to measure the feature instead.
 */
export const COPILOT_REVIEWER_LOGIN = "copilot-pull-request-reviewer[bot]";

/**
 * Author login shown on pull requests opened by the Copilot coding agent. It is
 * not a `[bot]` account, so it passes the shared human-PR predicate and must be
 * matched by name to be told apart from a teammate.
 */
export const COPILOT_PR_AUTHOR = "Copilot";

/**
 * Share of merged pull requests that should receive a Copilot code review for
 * adoption to read as healthy, used by the Copilot dashboard insight. Tuned to
 * flag low uptake without penalising teams that use Copilot selectively.
 */
export const COPILOT_REVIEW_ADOPTION_PCT = 20;

/**
 * Workflows that are CI tooling rather than the team's own pipelines. Excluded
 * from workflow metrics so a scanner ("CodeQL") or a labeller ("Labeler") never
 * inflates run counts, durations, or failure Pareto charts. Centralised so a
 * new exclusion is a single-list change, not a query-by-query edit.
 */
export const EXCLUDED_WORKFLOW_NAMES = ["CodeQL", "Labeler"];

/** Repository whose external contributions the DX Team dashboard measures. */
export const DX_TEAM_IO_INFRA_REPOSITORY = "io-infra";

/**
 * Substrings that mark a repository as DX-owned (or DX tooling). Commits on
 * these repositories are excluded from "DX members on non-DX repos" metrics so
 * the number reflects work done outside the team's own area.
 */
export const DX_TEAM_COMMIT_EXCLUDED_SUBSTRINGS = [
  "dx",
  "eng",
  "technology-radar",
];

/** Substrings excluded when counting DX members' commits by repository. */
export const DX_TEAM_COMMITS_BY_REPO_EXCLUDED_SUBSTRINGS = [
  "pagopa-dx",
  `${ORGANIZATION}/terraform`,
];

/** Code-search query used to detect repositories adopting DX tooling. */
export const DX_ADOPTION_CODE_SEARCH_QUERY = "pagopa/dx org:pagopa";

/**
 * IaC pull requests with these titles are release automation, not real
 * infrastructure changes, and are excluded from IaC metrics.
 */
export const IAC_EXCLUDED_PR_TITLES = ["Version Packages"];

/**
 * Reference targets used by insight rules to turn a raw number into a
 * good/bad judgement. Values confirmed by the team, tuned to avoid noisy
 * warnings (a miss within `INSIGHT_THRESHOLDS.targetTolerancePct` is neutral).
 */
export const METRIC_TARGETS = {
  dxPipelineAdoptionPct: 80,
  leadTimeDays: 5,
  minTrendRSquared: 0.3,
  moduleUpToDatePct: 80,
  significantChangePct: 30,
  staleOpenPrDays: 21,
  timeToFirstReviewHours: 48,
  workflowSuccessRatePct: 90,
} as const;

/**
 * Share/ratio thresholds above which an insight escalates from neutral to
 * warning. Kept here so tuning warning sensitivity is a single-file change.
 */
export const INSIGHT_THRESHOLDS = {
  ciCostHotspotShare: 0.6,
  // Beyond `criticalMultiplier` times the target (bad direction) an insight
  // escalates from warning to critical (red).
  criticalMultiplier: 2,
  durationSpreadRatio: 8,
  dxSupervisedShare: 0.8,
  failedRunWasteShare: 0.2,
  failureHotspotShare: 0.5,
  governanceGapShare: 0.5,
  largePrShare: 0.4,
  leadTimeSpreadRatio: 5,
  // Below this many observations a rule still fires, but the reading is marked
  // low confidence so a signal from a handful of items is not over-trusted.
  minReliableSampleSize: 10,
  reviewerLoadShare: 0.5,
  reviewBusFactorShare: 0.5,
  reviewWaitDominanceShare: 0.7,
  slowPrConcentrationShare: 0.6,
  spreadMinMedianDays: 1,
  spreadMinMedianHours: 4,
  spreadMinMedianMinutes: 5,
  staleModuleShare: 0.3,
  // Share of still-open pull requests with no activity for `staleOpenPrDays`
  // above which the backlog is flagged as stale.
  stalePrShare: 0.3,
  targetTolerancePct: 25,
  teamBusFactorShare: 0.5,
  techradarCoverage: 0.3,
  trackerBacklogShare: 0.1,
  unsupervisedShare: 0.6,
  unreviewedMergeShare: 0.4,
} as const;

export const TIME_INTERVALS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "120 days", value: 120 },
  { label: "240 days", value: 240 },
  { label: "300 days", value: 300 },
  { label: "360 days", value: 360 },
  { label: "720 days", value: 720 },
];

/**
 * Time windows shorter than this are bucketed by day, longer windows by week.
 * Defined in the shared config so both the SQL adapters and the chart captions
 * describe the same bucketing.
 */
export const WEEKLY_BUCKET_THRESHOLD_DAYS = 240;

/**
 * How many days of lag between the reference date and "now" still count as
 * fresh. Past this the freshness note turns amber, so a viewer notices the
 * importer has fallen behind instead of trusting stale numbers.
 */
export const DATA_STALE_AFTER_DAYS = 3;
