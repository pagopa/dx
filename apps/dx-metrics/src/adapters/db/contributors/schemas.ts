/** Zod schemas and inferred types for the cross-repository contributors adapter. */

import { z } from "zod";

import {
  nullableSqlNumberSchema,
  sqlDateSchema,
  sqlNumberSchema,
} from "../shared/sql-parsing";

/** Input accepted by {@link getContributorsDashboard}. */
export const getContributorsDashboardInputSchema = z.object({
  days: z.number().int().nonnegative(),
  /** Full repository names (e.g. `pagopa/dx`) the dashboard aggregates over. */
  repositories: z.array(z.string().min(1)),
});

/** Human pull requests created in the window, per author and repository. */
export const contributorPrCreatedRowSchema = z.object({
  login: z.string().min(1),
  prsCreated: sqlNumberSchema,
  repository: z.string().min(1),
});

/** Human pull requests merged in the window, per author and repository. */
export const contributorPrMergedRowSchema = z.object({
  login: z.string().min(1),
  prsMerged: sqlNumberSchema,
  repository: z.string().min(1),
});

/**
 * Merges in the window, grouped by the repository they landed in and the
 * person who merged them.
 */
export const contributorMergeRowSchema = z.object({
  login: z.string().min(1),
  merges: sqlNumberSchema,
  repository: z.string().min(1),
});

/** Human reviews submitted in the window, per reviewer. */
export const contributorReviewRowSchema = z.object({
  login: z.string().min(1),
  reviewsGiven: sqlNumberSchema,
});

/** Commits in the window, per author and repository. */
export const contributorCommitRowSchema = z.object({
  commits: sqlNumberSchema,
  login: z.string().min(1),
  repository: z.string().min(1),
});

/** Median lead time (days) for the merged pull requests of each author. */
export const contributorLeadTimeRowSchema = z.object({
  login: z.string().min(1),
  medianLeadTimeDays: nullableSqlNumberSchema,
});

/** Weekly merged pull requests and distinct contributing authors. */
export const activityTrendRowSchema = z.object({
  contributors: sqlNumberSchema,
  prsMerged: sqlNumberSchema,
  week: sqlDateSchema,
});

/** Headline numbers for the contributors dashboard. */
export interface ContributorsSummary {
  /** Distinct logins that authored, reviewed, merged, or committed. */
  readonly activeContributors: number;
  /** Distinct logins that merged at least one pull request. */
  readonly distinctMergers: number;
  /** Human pull requests merged in the window. */
  readonly mergedPrCount: number;
  /** Busiest PR author's merged PRs / merged PR count, 0..1. */
  readonly topContributorShare: number;
  /** Busiest merger's merges / total merges, 0..1. */
  readonly topMergerShare: number;
  /** Commits in the window. */
  readonly totalCommits: number;
  /** Human reviews in the window. */
  readonly totalReviews: number;
}

/** One row of the merger bus-factor ranking. */
export interface Merger {
  readonly login: string;
  readonly merges: number;
  /** Distinct repositories the person merged in. */
  readonly repos: number;
  /** Merges / total merges, 0..1. */
  readonly share: number;
}

/** Per-repository merge concentration. */
export interface MergesByRepository {
  readonly mergers: number;
  readonly repository: string;
  readonly topMerger: string;
  readonly topMergerMerges: number;
  readonly topMergerShare: number;
  readonly totalMerges: number;
}

/** One contributor's activity, merged across every source in TypeScript. */
export interface Contributor {
  readonly commits: number;
  readonly login: string;
  readonly medianLeadTimeDays: null | number;
  readonly merges: number;
  readonly prsCreated: number;
  readonly prsMerged: number;
  readonly reposTouched: number;
  readonly reviewsGiven: number;
}

/** Per-repository commit ownership. */
export interface OwnershipByRepo {
  readonly repository: string;
  readonly topAuthor: string;
  readonly topAuthorCommits: number;
  /** Top author's commits / total commits, 0..1. */
  readonly topAuthorShare: number;
  readonly totalCommits: number;
}

/** Weekly merge activity and distinct authors. */
export interface ActivityTrend {
  readonly contributors: number;
  readonly prsMerged: number;
  readonly week: string;
}

/** Complete contributors & ownership dashboard payload. */
export interface ContributorsDashboard {
  readonly activityTrend: ActivityTrend[];
  readonly contributors: Contributor[];
  readonly mergers: Merger[];
  readonly mergesByRepository: MergesByRepository[];
  readonly ownershipByRepo: OwnershipByRepo[];
  readonly summary: ContributorsSummary;
}

export type GetContributorsDashboardInput = z.infer<
  typeof getContributorsDashboardInputSchema
>;
