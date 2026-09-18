/** Cross-repository contributors & ownership queries for the dashboard. */

import { sql, type SQL } from "drizzle-orm";

import { buildContributorsInsights } from "@/lib/insights/contributors";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type {
  Contributor,
  ContributorsDashboard,
  GetContributorsDashboardInput,
  Merger,
  MergesByRepository,
  OwnershipByRepo,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import {
  botAuthorsExclusion,
  humanPullRequest,
  isHumanReview,
  textArray,
  timeBucket,
} from "../shared/sql-fragments";
import { parseSqlRows } from "../shared/sql-parsing";
import {
  activityTrendRowSchema,
  contributorCommitRowSchema,
  contributorLeadTimeRowSchema,
  contributorMergeRowSchema,
  contributorPrCreatedRowSchema,
  contributorPrMergedRowSchema,
  contributorReviewRowSchema,
} from "./schemas";

/** Later of two ISO timestamps, used to anchor cross-source windows. */
const laterDate = (left: string, right: string): string =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;

/** Rounds a ratio to four decimals, returning `0` for an empty denominator. */
const ratio = (numerator: number, denominator: number): number =>
  denominator <= 0
    ? 0
    : Math.round((numerator / denominator) * 10_000) / 10_000;

/**
 * Resolves the window anchor: the later of the newest pull-request activity
 * and the newest commit across the configured repositories. Anchoring to data
 * instead of `NOW()` keeps the window comparable when the importer lags.
 */
const fetchReferenceDate = async (
  db: Database,
  repositories: SQL,
): Promise<string> => {
  const [prReferenceResult, commitReferenceResult] = await Promise.all([
    db.execute(
      buildReferenceDateQuery({
        column: "GREATEST(pr.created_at, pr.merged_at)",
        from: "pull_requests pr JOIN repositories r ON pr.repository_id = r.id",
        where: sql`r.full_name = ANY(${repositories})`,
      }),
    ),
    db.execute(
      buildReferenceDateQuery({
        column: "committer_date",
        from: "commits",
        where: sql`repository_full_name = ANY(${repositories})`,
      }),
    ),
  ]);

  const prReference = parseReferenceDate(
    prReferenceResult.rows[0],
    "contributors pr referenceDate",
  );
  const commitReference = parseReferenceDate(
    commitReferenceResult.rows[0],
    "contributors commit referenceDate",
  );

  return laterDate(prReference, commitReference);
};

/** Human pull requests created in the window, grouped by author and repository. */
const fetchPrCreatedRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT pr.author AS login, r.full_name AS repository, COUNT(*) AS "prsCreated"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.author IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY pr.author, r.full_name
    ORDER BY "prsCreated" DESC, login, repository
  `);
  return parseSqlRows(
    contributorPrCreatedRowSchema,
    result.rows,
    "contributors prCreated",
  );
};

/** Human pull requests merged in the window, grouped by author and repository. */
const fetchPrMergedRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT pr.author AS login, r.full_name AS repository, COUNT(*) AS "prsMerged"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND pr.author IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY pr.author, r.full_name
    ORDER BY "prsMerged" DESC, login, repository
  `);
  return parseSqlRows(
    contributorPrMergedRowSchema,
    result.rows,
    "contributors prMerged",
  );
};

/**
 * Merges in the window grouped by repository and merger.
 *
 * This is the population behind both the per-merger ranking and the
 * per-repository concentration: they are two views of one scan, so the two
 * tables can never disagree on who merged what. Bots (e.g. Renovate) and
 * merges with no recorded merger are excluded; `botAuthorsExclusion` is fed
 * the unqualified column because the predicate embeds it with `sql.raw`.
 */
const fetchMergeRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT pr.merged_by AS login, r.full_name AS repository,
      COUNT(*) AS merges
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND pr.merged_by IS NOT NULL
      AND ${botAuthorsExclusion("merged_by")}
      AND ${humanPullRequest("pr")}
    GROUP BY pr.merged_by, r.full_name
    ORDER BY repository, merges DESC, login
  `);
  return parseSqlRows(
    contributorMergeRowSchema,
    result.rows,
    "contributors mergers",
  );
};

/**
 * Human reviews submitted in the window, per reviewer. Matches the review
 * dashboard population: reviews by a human other than the author, on a human
 * pull request. Without it, bot or self reviews would inflate the count and the
 * active-contributor set.
 */
const fetchReviewRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT prr.reviewer AS login, COUNT(*) AS "reviewsGiven"
    FROM pull_request_reviews prr
    JOIN pull_requests pr ON prr.pull_request_id = pr.id
    JOIN repositories r ON prr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND prr.submitted_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND ${humanPullRequest("pr")}
      AND ${isHumanReview("prr", "pr")}
    GROUP BY prr.reviewer
    ORDER BY "reviewsGiven" DESC, login
  `);
  return parseSqlRows(
    contributorReviewRowSchema,
    result.rows,
    "contributors reviews",
  );
};

/** Commits in the window, grouped by author and repository. */
const fetchCommitRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT author AS login, repository_full_name AS repository, COUNT(*) AS commits
    FROM commits
    WHERE repository_full_name = ANY(${repositories})
      AND committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND author IS NOT NULL
      AND ${botAuthorsExclusion("author")}
    GROUP BY author, repository_full_name
    ORDER BY repository, commits DESC, login
  `);
  return parseSqlRows(
    contributorCommitRowSchema,
    result.rows,
    "contributors commits",
  );
};

/** Median lead time (days) per author of merged pull requests in the window. */
const fetchLeadTimeRows = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT pr.author AS login,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (pr.merged_at - pr.created_at)) / 86400
      )::numeric, 2) AS "medianLeadTimeDays"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL AND pr.created_at IS NOT NULL
      AND pr.author IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY pr.author
    ORDER BY login
  `);
  return parseSqlRows(
    contributorLeadTimeRowSchema,
    result.rows,
    "contributors leadTime",
  );
};

/** Weekly merged pull requests and distinct authors, for the trend chart. */
const fetchActivityTrend = async (
  db: Database,
  repositories: SQL,
  referenceDate: string,
  days: number,
) => {
  const result = await db.execute(sql`
    SELECT ${timeBucket("pr.merged_at", days)} AS week,
      COUNT(*) AS "prsMerged",
      COUNT(DISTINCT pr.author) AS contributors
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ANY(${repositories})
      AND pr.merged_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND pr.merged_at IS NOT NULL
      AND ${humanPullRequest("pr")}
    GROUP BY week
    ORDER BY week
  `);
  return parseSqlRows(
    activityTrendRowSchema,
    result.rows,
    "contributors activityTrend",
  );
};

interface ContributorState {
  commits: number;
  merges: number;
  prsCreated: number;
  prsMerged: number;
  reviewsGiven: number;
  readonly repos: Set<string>;
}

/**
 * Merges the per-source aggregates by login. Contributors are ranked by
 * combined activity (merged PRs + reviews + commits); merge-only logins still
 * appear so the roster is complete, just lower in the list.
 */
const buildContributors = (
  createdRows: readonly {
    login: string;
    prsCreated: number;
    repository: string;
  }[],
  mergedRows: readonly {
    login: string;
    prsMerged: number;
    repository: string;
  }[],
  reviewRows: readonly { login: string; reviewsGiven: number }[],
  commitRows: readonly { commits: number; login: string; repository: string }[],
  mergeRows: readonly { login: string; merges: number; repository: string }[],
  leadTimeRows: readonly { login: string; medianLeadTimeDays: null | number }[],
): Contributor[] => {
  const states = new Map<string, ContributorState>();

  const ensure = (login: string): ContributorState => {
    const existing = states.get(login);
    if (existing !== undefined) {
      return existing;
    }

    const created = {
      commits: 0,
      merges: 0,
      prsCreated: 0,
      prsMerged: 0,
      reviewsGiven: 0,
      repos: new Set<string>(),
    };
    states.set(login, created);
    return created;
  };

  for (const row of createdRows) {
    const state = ensure(row.login);
    state.prsCreated += row.prsCreated;
    state.repos.add(row.repository);
  }
  for (const row of mergedRows) {
    const state = ensure(row.login);
    state.prsMerged += row.prsMerged;
    state.repos.add(row.repository);
  }
  for (const row of reviewRows) {
    ensure(row.login).reviewsGiven += row.reviewsGiven;
  }
  for (const row of commitRows) {
    const state = ensure(row.login);
    state.commits += row.commits;
    state.repos.add(row.repository);
  }
  for (const row of mergeRows) {
    const state = ensure(row.login);
    state.merges += row.merges;
    state.repos.add(row.repository);
  }

  const leadTimes = new Map(
    leadTimeRows.map((row) => [row.login, row.medianLeadTimeDays]),
  );

  return [...states.entries()]
    .map(([login, state]) => ({
      commits: state.commits,
      login,
      medianLeadTimeDays: leadTimes.get(login) ?? null,
      merges: state.merges,
      prsCreated: state.prsCreated,
      prsMerged: state.prsMerged,
      reposTouched: state.repos.size,
      reviewsGiven: state.reviewsGiven,
    }))
    .sort((left, right) => {
      const leftActivity = left.prsMerged + left.reviewsGiven + left.commits;
      const rightActivity =
        right.prsMerged + right.reviewsGiven + right.commits;
      return (
        rightActivity - leftActivity || left.login.localeCompare(right.login)
      );
    });
};

/** Aggregates the per-(repository, merger) scan into the merger ranking. */
const buildMergers = (
  mergeRows: readonly {
    merges: number;
    login: string;
    repository: string;
  }[],
  totalMerges: number,
): Merger[] => {
  const states = new Map<
    string,
    { merges: number; readonly repos: Set<string> }
  >();

  for (const row of mergeRows) {
    const existing = states.get(row.login);

    if (existing === undefined) {
      states.set(row.login, {
        merges: row.merges,
        repos: new Set([row.repository]),
      });
      continue;
    }

    existing.merges += row.merges;
    existing.repos.add(row.repository);
  }

  return [...states.entries()]
    .map(([login, state]) => ({
      login,
      merges: state.merges,
      repos: state.repos.size,
      share: ratio(state.merges, totalMerges),
    }))
    .sort(
      (left, right) =>
        right.merges - left.merges || left.login.localeCompare(right.login),
    );
};

/**
 * Aggregates the same scan by repository to expose the per-repository merger
 * bus factor: how many people merge there, and how much of the merging the
 * busiest one performs.
 */
const buildMergesByRepository = (
  mergeRows: readonly { merges: number; login: string; repository: string }[],
): MergesByRepository[] => {
  const states = new Map<
    string,
    {
      mergers: Set<string>;
      topMerger: string;
      topMergerMerges: number;
      totalMerges: number;
    }
  >();

  for (const row of mergeRows) {
    const existing = states.get(row.repository);

    if (existing === undefined) {
      states.set(row.repository, {
        mergers: new Set([row.login]),
        topMerger: row.login,
        topMergerMerges: row.merges,
        totalMerges: row.merges,
      });
      continue;
    }

    existing.totalMerges += row.merges;
    existing.mergers.add(row.login);

    const isBusier = row.merges > existing.topMergerMerges;
    const isTieBreak =
      row.merges === existing.topMergerMerges &&
      row.login.localeCompare(existing.topMerger) < 0;

    if (isBusier || isTieBreak) {
      existing.topMerger = row.login;
      existing.topMergerMerges = row.merges;
    }
  }

  return [...states.entries()]
    .map(([repository, state]) => ({
      mergers: state.mergers.size,
      repository,
      topMerger: state.topMerger,
      topMergerMerges: state.topMergerMerges,
      topMergerShare: ratio(state.topMergerMerges, state.totalMerges),
      totalMerges: state.totalMerges,
    }))
    .sort(
      (left, right) =>
        right.totalMerges - left.totalMerges ||
        left.repository.localeCompare(right.repository),
    );
};

/** Aggregates commit ownership per repository from the author-level scan. */
const buildOwnershipByRepo = (
  commitRows: readonly { commits: number; login: string; repository: string }[],
): OwnershipByRepo[] => {
  const states = new Map<
    string,
    { topAuthor: string; topAuthorCommits: number; totalCommits: number }
  >();

  for (const row of commitRows) {
    const existing = states.get(row.repository);

    if (existing === undefined) {
      states.set(row.repository, {
        topAuthor: row.login,
        topAuthorCommits: row.commits,
        totalCommits: row.commits,
      });
      continue;
    }

    existing.totalCommits += row.commits;

    const isBusier = row.commits > existing.topAuthorCommits;
    const isTieBreak =
      row.commits === existing.topAuthorCommits &&
      row.login.localeCompare(existing.topAuthor) < 0;

    if (isBusier || isTieBreak) {
      existing.topAuthor = row.login;
      existing.topAuthorCommits = row.commits;
    }
  }

  return [...states.entries()]
    .map(([repository, state]) => ({
      repository,
      topAuthor: state.topAuthor,
      topAuthorCommits: state.topAuthorCommits,
      topAuthorShare: ratio(state.topAuthorCommits, state.totalCommits),
      totalCommits: state.totalCommits,
    }))
    .sort(
      (left, right) =>
        right.totalCommits - left.totalCommits ||
        left.repository.localeCompare(right.repository),
    );
};

/** Fetches the complete contributors & ownership dashboard for the window. */
export const getContributorsDashboard = async (
  db: Database,
  input: GetContributorsDashboardInput,
): Promise<ContributorsDashboard & WithInsights & WithMeta> => {
  const { days, repositories } = input;
  const repositoriesSql = textArray(repositories);

  const referenceDate = await fetchReferenceDate(db, repositoriesSql);

  const [
    createdRows,
    mergedRows,
    mergeRows,
    reviewRows,
    commitRows,
    leadTimeRows,
    activityTrend,
  ] = await Promise.all([
    fetchPrCreatedRows(db, repositoriesSql, referenceDate, days),
    fetchPrMergedRows(db, repositoriesSql, referenceDate, days),
    fetchMergeRows(db, repositoriesSql, referenceDate, days),
    fetchReviewRows(db, repositoriesSql, referenceDate, days),
    fetchCommitRows(db, repositoriesSql, referenceDate, days),
    fetchLeadTimeRows(db, repositoriesSql, referenceDate, days),
    fetchActivityTrend(db, repositoriesSql, referenceDate, days),
  ]);

  const totalMerges = mergeRows.reduce((sum, row) => sum + row.merges, 0);
  const mergedPrCount = mergedRows.reduce((sum, row) => sum + row.prsMerged, 0);
  const totalReviews = reviewRows.reduce(
    (sum, row) => sum + row.reviewsGiven,
    0,
  );
  const totalCommits = commitRows.reduce((sum, row) => sum + row.commits, 0);

  const contributors = buildContributors(
    createdRows,
    mergedRows,
    reviewRows,
    commitRows,
    mergeRows,
    leadTimeRows,
  );
  const mergers = buildMergers(mergeRows, totalMerges);
  const mergesByRepository = buildMergesByRepository(mergeRows);
  const ownershipByRepo = buildOwnershipByRepo(commitRows);

  const topMergerMerges = mergers[0]?.merges ?? 0;
  const topContributorMerges = contributors.reduce(
    (max, contributor) => Math.max(max, contributor.prsMerged),
    0,
  );

  const summary = {
    activeContributors: contributors.length,
    distinctMergers: mergers.length,
    mergedPrCount,
    topContributorShare: ratio(topContributorMerges, mergedPrCount),
    topMergerShare: ratio(topMergerMerges, totalMerges),
    totalCommits,
    totalReviews,
  };

  const dashboard: ContributorsDashboard = {
    activityTrend,
    contributors,
    mergers,
    mergesByRepository,
    ownershipByRepo,
    summary,
  };

  return {
    ...dashboard,
    insights: buildContributorsInsights({
      mergers,
      ownershipByRepo,
      summary: {
        mergedPrCount,
        topContributorShare: summary.topContributorShare,
        topMergerShare: summary.topMergerShare,
        totalCommits,
      },
    }),
    meta: { days, referenceDate },
  };
};
