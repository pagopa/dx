/** Database adapter implementation for the DX Team dashboard. */

import { sql } from "drizzle-orm";

import { buildDxTeamInsights } from "@/lib/insights/dx-team";
import type { WithInsights } from "@/lib/insights/types";
import {
  DX_ADOPTION_CODE_SEARCH_QUERY,
  DX_TEAM_COMMITS_BY_REPO_EXCLUDED_SUBSTRINGS,
  DX_TEAM_COMMIT_EXCLUDED_SUBSTRINGS,
  DX_TEAM_IO_INFRA_REPOSITORY,
} from "@/lib/config";

import type { Database, WithMeta } from "../shared/types";
import type {
  DxTeamDashboardResult,
  FetchDxTeamDashboardInput,
} from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import {
  notLikeAll,
  timeBucket,
  timeBucketInterval,
} from "../shared/sql-fragments";
import { parseSqlRows } from "../shared/sql-parsing";
import {
  commitsByRepoRowSchema,
  dxAdoptingProjectRowSchema,
  dxCommitRowSchema,
  dxPipelinesUsageRowSchema,
  ioInfraPrRowSchema,
  ioInfraPrTableRowSchema,
} from "./schemas";

/** Fetches all data for the DX Team dashboard. */
export const fetchDxTeamDashboard = async (
  db: Database,
  params: FetchDxTeamDashboardInput,
): Promise<DxTeamDashboardResult & WithInsights & WithMeta> => {
  const { days, organization: org } = params;

  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({ column: "committer_date", from: "commits" }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "dx-team referenceDate",
  );

  const [
    ioInfraPrs,
    dxCommits,
    ioInfraPrTable,
    commitsByRepo,
    dxAdoptingProjects,
    dxPipelinesUsage,
  ] = await Promise.all([
    fetchIoInfraPrs(db, days, org, referenceDate),
    fetchDxCommits(db, days, org, referenceDate),
    fetchIoInfraPrTable(db, days, org, referenceDate),
    fetchCommitsByRepo(db, days, org, referenceDate),
    fetchDxAdoptingProjects(db),
    fetchDxPipelinesUsage(db),
  ]);

  const dashboard = {
    commitsByRepo,
    dxAdoptingProjects,
    dxCommits,
    dxPipelinesUsage,
    ioInfraPrs,
    ioInfraPrTable,
  };

  return {
    ...dashboard,
    insights: buildDxTeamInsights(dashboard),
    meta: { days, referenceDate },
  };
};

/** PRs on the io-infra repository: DX vs non-DX members. */
const fetchIoInfraPrs = async (
  db: Database,
  days: number,
  org: string,
  referenceDate: string,
) => {
  const result = await db.execute(sql`
    WITH dx_members AS (SELECT username FROM dx_team_members),
    date_series AS (
      SELECT ${timeBucket("d", days)} AS date
      FROM generate_series(
        (${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days}))::date,
        (${referenceDate}::timestamptz)::date,
        ${timeBucketInterval(days)}
      ) d
    ),
    pr_counts AS (
      SELECT
        ${timeBucket("pr.created_at", days)} AS "prDate",
        SUM(CASE WHEN pr.author IN (SELECT username FROM dx_members) THEN 1 ELSE 0 END) AS "dxPr",
        SUM(CASE WHEN pr.author NOT IN (SELECT username FROM dx_members) THEN 1 ELSE 0 END) AS "nonDxPr"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${`${org}/${DX_TEAM_IO_INFRA_REPOSITORY}`}
        AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
        AND (pr.draft IS NULL OR pr.draft = 0)
      GROUP BY "prDate"
    )
    SELECT ds.date, SUM(COALESCE(pc."dxPr", 0)) AS "dxPr", SUM(COALESCE(pc."nonDxPr", 0)) AS "nonDxPr"
    FROM date_series ds LEFT JOIN pr_counts pc ON ds.date = pc."prDate"
    GROUP BY ds.date
    ORDER BY ds.date
  `);
  return parseSqlRows(ioInfraPrRowSchema, result.rows, "dx-team ioInfraPrs");
};

/** DX members' commits on non-DX repositories. */
const fetchDxCommits = async (
  db: Database,
  days: number,
  org: string,
  referenceDate: string,
) => {
  const result = await db.execute(sql`
    SELECT committer_date::date AS "committerDate", author AS "memberName", COUNT(*) AS "repositoryCommits"
    FROM commits
    WHERE author IN (SELECT username FROM dx_team_members)
      AND committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND repository_full_name LIKE ${`%${org}%`}
      AND ${notLikeAll("repository_full_name", DX_TEAM_COMMIT_EXCLUDED_SUBSTRINGS)}
    GROUP BY committer_date::date, author ORDER BY "committerDate"
  `);
  return parseSqlRows(dxCommitRowSchema, result.rows, "dx-team dxCommits");
};

/** io-infra PR table (list of PRs with author and date). */
const fetchIoInfraPrTable = async (
  db: Database,
  days: number,
  org: string,
  referenceDate: string,
) => {
  const result = await db.execute(sql`
    SELECT pr.author, pr.created_at AS "createdAt"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${`${org}/${DX_TEAM_IO_INFRA_REPOSITORY}`}
      AND pr.created_at >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND (pr.draft IS NULL OR pr.draft = 0)
    ORDER BY "createdAt" DESC
  `);
  return parseSqlRows(
    ioInfraPrTableRowSchema,
    result.rows,
    "dx-team ioInfraPrTable",
  );
};

/** DX members' commits by repository. */
const fetchCommitsByRepo = async (
  db: Database,
  days: number,
  org: string,
  referenceDate: string,
) => {
  const result = await db.execute(sql`
    SELECT author AS "memberName", repository_full_name AS "fullName", COUNT(*) AS "repositoryCommits"
    FROM commits
    WHERE author IN (SELECT username FROM dx_team_members)
      AND committer_date >= ${referenceDate}::timestamptz - MAKE_INTERVAL(days => ${days})
      AND repository_full_name LIKE ${`${org}/%`}
      AND ${notLikeAll("repository_full_name", DX_TEAM_COMMITS_BY_REPO_EXCLUDED_SUBSTRINGS)}
    GROUP BY author, repository_full_name ORDER BY author, "repositoryCommits" DESC
  `);
  return parseSqlRows(
    commitsByRepoRowSchema,
    result.rows,
    "dx-team commitsByRepo",
  );
};

/** Projects adopting DX tooling. */
const fetchDxAdoptingProjects = async (db: Database) => {
  const result = await db.execute(sql`
    SELECT DISTINCT repository_full_name AS repository
    FROM code_search_results
    WHERE query = ${DX_ADOPTION_CODE_SEARCH_QUERY}
      AND repository_full_name NOT LIKE '%dx%'
  `);
  return parseSqlRows(
    dxAdoptingProjectRowSchema,
    result.rows,
    "dx-team dxAdoptingProjects",
  );
};

/** DX Pipelines usage across repositories. */
const fetchDxPipelinesUsage = async (db: Database) => {
  const result = await db.execute(sql`
    SELECT
      dx_workflow AS "dxPath",
      COUNT(DISTINCT repository) AS "repositoryCount"
    FROM dx_pipeline_usages
    GROUP BY dx_workflow
    ORDER BY "repositoryCount" DESC
  `);
  return parseSqlRows(
    dxPipelinesUsageRowSchema,
    result.rows,
    "dx-team dxPipelinesUsage",
  );
};
