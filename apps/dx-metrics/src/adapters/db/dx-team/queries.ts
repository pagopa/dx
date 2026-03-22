/** Database adapter implementation for the DX Team dashboard. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type {
  DxTeamDashboardResult,
  FetchDxTeamDashboardInput,
} from "./schemas";

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
): Promise<DxTeamDashboardResult> => {
  const { days, organization: org } = params;

  const [
    ioInfraPrs,
    dxCommits,
    ioInfraPrTable,
    commitsByRepo,
    dxAdoptingProjects,
    dxPipelinesUsage,
  ] = await Promise.all([
    fetchIoInfraPrs(db, days, org),
    fetchDxCommits(db, days),
    fetchIoInfraPrTable(db, days, org),
    fetchCommitsByRepo(db, days, org),
    fetchDxAdoptingProjects(db),
    fetchDxPipelinesUsage(db),
  ]);

  return {
    commitsByRepo,
    dxAdoptingProjects,
    dxCommits,
    dxPipelinesUsage,
    ioInfraPrs,
    ioInfraPrTable,
  };
};

/** PRs on IO-Infra: DX vs non-DX members. */
const fetchIoInfraPrs = async (db: Database, days: number, org: string) => {
  const result = await db.execute(sql`
    WITH dx_members AS (SELECT username FROM dx_team_members),
    date_series AS (
      SELECT (CASE WHEN ${days} < 240 THEN d::date ELSE date_trunc('week', d)::date END) AS date
      FROM generate_series(
        (NOW() - MAKE_INTERVAL(days => ${days}))::date, CURRENT_DATE,
        CASE WHEN ${days} < 240 THEN '1 day'::interval ELSE '1 week'::interval END
      ) d
    ),
    pr_counts AS (
      SELECT
        CASE WHEN ${days} < 240 THEN pr.created_at::date
          ELSE date_trunc('week', pr.created_at)::date END AS "prDate",
        SUM(CASE WHEN pr.author IN (SELECT username FROM dx_members) THEN 1 ELSE 0 END) AS "dxPr",
        SUM(CASE WHEN pr.author NOT IN (SELECT username FROM dx_members) THEN 1 ELSE 0 END) AS "nonDxPr"
      FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
      WHERE r.full_name = ${`${org}/io-infra`}
        AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
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

/** DX Members Commits on Non-DX Repos. */
const fetchDxCommits = async (db: Database, days: number) => {
  const result = await db.execute(sql`
    SELECT committer_date::date AS "committerDate", author AS "memberName", COUNT(*) AS "repositoryCommits"
    FROM commits
    WHERE author IN (SELECT username FROM dx_team_members)
      AND committer_date >= NOW() - MAKE_INTERVAL(days => ${days})
      AND repository_full_name !~ '(dx|eng)' AND repository_full_name ~ 'pagopa'
      AND repository_full_name NOT LIKE '%technology-radar%'
    GROUP BY committer_date::date, author ORDER BY "committerDate"
  `);
  return parseSqlRows(dxCommitRowSchema, result.rows, "dx-team dxCommits");
};

/** IO-Infra PR table (list of PRs with author and date). */
const fetchIoInfraPrTable = async (db: Database, days: number, org: string) => {
  const result = await db.execute(sql`
    SELECT pr.author, pr.created_at AS "createdAt"
    FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
    WHERE r.full_name = ${`${org}/io-infra`}
      AND pr.created_at >= NOW() - MAKE_INTERVAL(days => ${days})
      AND (pr.draft IS NULL OR pr.draft = 0)
    ORDER BY "createdAt" DESC
  `);
  return parseSqlRows(
    ioInfraPrTableRowSchema,
    result.rows,
    "dx-team ioInfraPrTable",
  );
};

/** DX Members Commits by Repository. */
const fetchCommitsByRepo = async (db: Database, days: number, org: string) => {
  const result = await db.execute(sql`
    SELECT author AS "memberName", repository_full_name AS "fullName", COUNT(*) AS "repositoryCommits"
    FROM commits
    WHERE author IN (SELECT username FROM dx_team_members)
      AND committer_date >= NOW() - MAKE_INTERVAL(days => ${days})
      AND repository_full_name LIKE ${`${org}/%`}
      AND repository_full_name NOT LIKE '%pagopa-dx%'
      AND repository_full_name NOT LIKE ${`${org}/terraform%`}
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
    WHERE query = 'pagopa/dx org:pagopa'
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
