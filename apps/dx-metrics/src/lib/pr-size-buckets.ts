/**
 * Additions-based pull-request size buckets, shared by the SQL aggregation and
 * the insight rules.
 *
 * Declaring them once keeps the histogram the dashboard draws and the "large
 * PR" insight in sync: changing a boundary here updates both, instead of
 * leaving a hardcoded label set to silently stop matching the query.
 *
 * `max` is the inclusive upper bound of additions; the last bucket has `max:
 * null` and catches everything above the previous bound.
 */
export const PR_SIZE_BUCKETS = [
  { label: "0-50", max: 50 },
  { label: "51-200", max: 200 },
  { label: "201-500", max: 500 },
  { label: "501-1000", max: 1000 },
  { label: "1001+", max: null },
] as const;

/** Buckets whose additions already count as a large pull request. */
export const LARGE_PR_BUCKET_LABELS = new Set<string>(["501-1000", "1001+"]);
