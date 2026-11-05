/** SQL queries and data transformation for the releases dashboard. */

import { sql } from "drizzle-orm";

import { buildReleasesInsights } from "@/lib/insights/releases";
import type { WithInsights } from "@/lib/insights/types";

import type { Database, WithMeta } from "../shared/types";
import type { ReleasesDashboard } from "./schemas";

import {
  buildReferenceDateQuery,
  parseReferenceDate,
} from "../shared/reference-date";
import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  moduleSummaryRowSchema,
  releaseStatsRowSchema,
  releasesTimelineRowSchema,
} from "./schemas";

/** Fetches the full releases dashboard payload. */
export const getReleasesDashboard = async (
  db: Database,
): Promise<ReleasesDashboard & WithInsights & WithMeta> => {
  const referenceDateResult = await db.execute(
    buildReferenceDateQuery({
      column: "release_date",
      from: "terraform_registry_releases",
    }),
  );
  const referenceDate = parseReferenceDate(
    referenceDateResult.rows[0],
    "releases referenceDate",
  );

  // Aggregate stats
  const statsResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT module_name)                          AS "totalModules",
      COUNT(*)                                             AS "totalMajorVersions",
      COALESCE(SUM(releases_count), 0)                    AS "totalReleases",
      MIN(release_date)                                    AS "oldestRelease",
      MAX(release_date)                                    AS "newestRelease"
    FROM terraform_registry_releases
  `);
  const stats = parseSqlRow(
    releaseStatsRowSchema,
    statsResult.rows[0],
    "releases stats",
  );

  // Per-module summary
  const modulesSummary = await db.execute(sql`
    SELECT
      module_name AS "moduleName",
      provider,
      COUNT(*)                                            AS "majorVersionsCount",
      COALESCE(SUM(releases_count), 0)                   AS "totalReleases",
      MIN(release_date)::date                             AS "firstReleaseDate",
      MAX(release_date)::date                             AS "lastReleaseDate",
      MAX(major_version)                                  AS "latestMajor",
      STRING_AGG(
        'v' || major_version || ' (' || COALESCE(releases_count::text, '?') || ')',
        ', ' ORDER BY major_version
      )                                                   AS "versionsDetail"
    FROM terraform_registry_releases
    GROUP BY module_name, provider
    ORDER BY "totalReleases" DESC, "moduleName"
  `);

  // Releases timeline aggregated by month
  const releasesTimeline = await db.execute(sql`
    SELECT
      TO_CHAR(release_date, 'YYYY-MM')       AS month,
      COUNT(*)                               AS "majorVersionsIntroduced",
      COALESCE(SUM(releases_count), 0)       AS "totalReleases"
    FROM terraform_registry_releases
    WHERE release_date IS NOT NULL
    GROUP BY month
    ORDER BY month
  `);

  const dashboard = {
    modulesSummary: parseSqlRows(
      moduleSummaryRowSchema,
      modulesSummary.rows,
      "releases modulesSummary",
    ),
    releasesTimeline: parseSqlRows(
      releasesTimelineRowSchema,
      releasesTimeline.rows,
      "releases releasesTimeline",
    ),
    stats: {
      newestRelease: stats.newestRelease,
      oldestRelease: stats.oldestRelease,
      totalMajorVersions: stats.totalMajorVersions,
      totalModules: stats.totalModules,
      totalReleases: stats.totalReleases,
    },
  };

  return {
    ...dashboard,
    insights: buildReleasesInsights({ ...dashboard, referenceDate }),
    meta: { referenceDate },
  };
};
