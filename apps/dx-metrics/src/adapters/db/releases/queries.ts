/** SQL queries and data transformation for the releases dashboard. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type { ReleasesDashboard } from "./schemas";

import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  moduleSummaryRowSchema,
  releaseStatsRowSchema,
  releasesTimelineRowSchema,
} from "./schemas";

/** Fetches the full releases dashboard payload. */
export const getReleasesDashboard = async (
  db: Database,
): Promise<ReleasesDashboard> => {
  // Aggregate stats
  const statsResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT module_name)                          AS total_modules,
      COUNT(*)                                             AS total_major_versions,
      COALESCE(SUM(releases_count), 0)                    AS total_releases,
      MIN(release_date)                                    AS oldest_release,
      MAX(release_date)                                    AS newest_release
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
      module_name,
      provider,
      COUNT(*)                                            AS major_versions_count,
      COALESCE(SUM(releases_count), 0)                   AS total_releases,
      MIN(release_date)::date                             AS first_release_date,
      MAX(release_date)::date                             AS last_release_date,
      MAX(major_version)                                  AS latest_major,
      STRING_AGG(
        'v' || major_version || ' (' || COALESCE(releases_count::text, '?') || ')',
        ', ' ORDER BY major_version
      )                                                   AS versions_detail
    FROM terraform_registry_releases
    GROUP BY module_name, provider
    ORDER BY total_releases DESC, module_name
  `);

  // Releases timeline aggregated by month
  const releasesTimeline = await db.execute(sql`
    SELECT
      TO_CHAR(release_date, 'YYYY-MM')       AS month,
      COUNT(*)                               AS major_versions_introduced,
      COALESCE(SUM(releases_count), 0)       AS total_releases
    FROM terraform_registry_releases
    WHERE release_date IS NOT NULL
    GROUP BY month
    ORDER BY month
  `);

  return {
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
      newestRelease: stats.newest_release,
      oldestRelease: stats.oldest_release,
      totalMajorVersions: stats.total_major_versions,
      totalModules: stats.total_modules,
      totalReleases: stats.total_releases,
    },
  };
};
