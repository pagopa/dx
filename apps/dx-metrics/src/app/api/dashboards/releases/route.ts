import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

export async function GET() {
  try {
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
    const stats = statsResult.rows[0] as {
      newest_release: null | string;
      oldest_release: null | string;
      total_major_versions: string;
      total_modules: string;
      total_releases: string;
    };

    // Per-module summary: major versions count, total releases, first release date, latest major
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

    // Releases timeline: aggregated by month
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

    return NextResponse.json({
      modulesSummary: modulesSummary.rows,
      releasesTimeline: releasesTimeline.rows,
      stats: {
        newestRelease: stats.newest_release
          ? String(stats.newest_release).slice(0, 10)
          : null,
        oldestRelease: stats.oldest_release
          ? String(stats.oldest_release).slice(0, 10)
          : null,
        totalMajorVersions: Number(stats.total_major_versions),
        totalModules: Number(stats.total_modules),
        totalReleases: Number(stats.total_releases),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
