import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const repository = searchParams.get("repository") || "dx";
  const org = process.env.ORGANIZATION || "pagopa";
  const fullName = `${org}/${repository}`;

  try {
    // DX Pipeline Adoption (pie)
    const pipelineAdoption = await db.execute(sql`
      WITH distinct_workflows AS (
        SELECT DISTINCT ON (w.name) w.name, w.pipeline
        FROM workflows w JOIN repositories r ON w.repository_id = r.id
        WHERE r.full_name = ${fullName} AND w.name NOT IN ('CodeQL', 'Labeler')
      )
      SELECT CASE WHEN pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END AS pipeline_type,
        COUNT(*) AS pipeline_count
      FROM distinct_workflows
      GROUP BY CASE WHEN pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END
      ORDER BY pipeline_type
    `);

    // DX Terraform Modules Adoption (pie)
    const moduleAdoption = await db.execute(sql`
      WITH distinct_modules AS (
        SELECT DISTINCT ON (module) module
        FROM terraform_modules
        WHERE repository = ${fullName}
          AND module NOT LIKE './%' AND module NOT LIKE '../%'
      )
      SELECT CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%'
        THEN 'DX Terraform Modules' ELSE 'Non-DX Terraform Modules' END AS module_type,
        COUNT(*) AS module_count
      FROM distinct_modules
      GROUP BY CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%'
        THEN 'DX Terraform Modules' ELSE 'Non-DX Terraform Modules' END
      ORDER BY module_type
    `);

    // Workflows List
    const workflowsList = await db.execute(sql`
      SELECT DISTINCT ON (w.name) w.name AS workflow_name,
        CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN '✓ DX' ELSE 'Non-DX' END AS pipeline_type
      FROM workflows w JOIN repositories r ON w.repository_id = r.id
      WHERE r.full_name = ${fullName} AND w.name NOT IN ('CodeQL', 'Labeler')
      ORDER BY w.name, CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 0 ELSE 1 END
    `);

    // Terraform Modules List
    const modulesList = await db.execute(sql`
      SELECT DISTINCT ON (module) module AS module_name,
        CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%' THEN '✓ DX' ELSE 'Non-DX' END AS module_type,
        file_path
      FROM terraform_modules
      WHERE repository = ${fullName}
        AND module NOT LIKE './%' AND module NOT LIKE '../%'
      ORDER BY module, CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%' THEN 0 ELSE 1 END
    `);

    // Version Drift: compare used version constraint vs latest available for DX modules
    // tm.version is a Terraform constraint like "~> 2.1" — we consider it up-to-date
    // if it's on the same MAJOR version as the latest release.
    const versionDriftList = await db.execute(sql`
      SELECT
        tm.module AS module_name,
        tm.version AS used_version,
        trr.latest_version,
        tm.file_path,
        CASE
          WHEN tm.version IS NULL OR trr.latest_version IS NULL THEN 'unknown'
          WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
               = trr.major_version THEN 'up-to-date'
          WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
               < trr.major_version THEN 'outdated'
          ELSE 'unknown'
        END AS drift_status
      FROM terraform_modules tm
      LEFT JOIN LATERAL (
        SELECT latest_version, major_version FROM terraform_registry_releases trr
        WHERE trr.module_name = SPLIT_PART(tm.module, '/', 2)
        ORDER BY trr.major_version DESC
        LIMIT 1
      ) trr ON true
      WHERE tm.repository = ${fullName}
        AND (tm.module LIKE '%pagopa-dx%' OR tm.module LIKE '%pagopa/dx%')
        AND tm.module NOT LIKE './%'
        AND tm.module NOT LIKE '../%'
      ORDER BY drift_status DESC, tm.module
    `);

    const versionDriftSummary = await db.execute(sql`
      WITH drift AS (
        SELECT
          CASE
            WHEN tm.version IS NULL OR trr.latest_version IS NULL THEN 'unknown'
            WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
                 = trr.major_version THEN 'up-to-date'
            WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
                 < trr.major_version THEN 'outdated'
            ELSE 'unknown'
          END AS drift_status
        FROM terraform_modules tm
        LEFT JOIN LATERAL (
          SELECT major_version, latest_version FROM terraform_registry_releases trr
          WHERE trr.module_name = SPLIT_PART(tm.module, '/', 2)
          ORDER BY trr.major_version DESC
          LIMIT 1
        ) trr ON true
        WHERE tm.repository = ${fullName}
          AND (tm.module LIKE '%pagopa-dx%' OR tm.module LIKE '%pagopa/dx%')
          AND tm.module NOT LIKE './%'
          AND tm.module NOT LIKE '../%'
      )
      SELECT
        COUNT(*) FILTER (WHERE drift_status = 'up-to-date') AS up_to_date,
        COUNT(*) FILTER (WHERE drift_status = 'outdated') AS outdated,
        COUNT(*) FILTER (WHERE drift_status = 'unknown') AS unknown,
        COUNT(*) AS total
      FROM drift
    `);

    return NextResponse.json({
      pipelineAdoption: pipelineAdoption.rows,
      moduleAdoption: moduleAdoption.rows,
      workflowsList: workflowsList.rows,
      modulesList: modulesList.rows,
      versionDriftList: versionDriftList.rows,
      versionDriftSummary: {
        upToDate: Number(versionDriftSummary.rows[0]?.up_to_date) || 0,
        outdated: Number(versionDriftSummary.rows[0]?.outdated) || 0,
        unknown: Number(versionDriftSummary.rows[0]?.unknown) || 0,
        total: Number(versionDriftSummary.rows[0]?.total) || 0,
      },
    });
  } catch (error) {
    console.error("DX Adoption dashboard error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
