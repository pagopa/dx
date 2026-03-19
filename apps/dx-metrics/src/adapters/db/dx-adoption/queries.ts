/** DX Adoption dashboard — SQL queries and data transformation logic. */

import { sql } from "drizzle-orm";

import type { Database } from "../shared/types";
import type { DxAdoptionResult, FetchDxAdoptionInput } from "./schemas";

import { parseSqlRow, parseSqlRows } from "../shared/sql-parsing";
import {
  moduleAdoptionRowSchema,
  moduleRowSchema,
  pipelineAdoptionRowSchema,
  versionDriftRowSchema,
  versionDriftSummaryRowSchema,
  workflowRowSchema,
} from "./schemas";

/**
 * Fetches all data required by the DX Adoption dashboard for a given
 * repository and returns the assembled result.
 */
export const fetchDxAdoption = async (
  db: Database,
  { fullName }: FetchDxAdoptionInput,
): Promise<DxAdoptionResult> => {
  // DX Pipeline Adoption (pie)
  const pipelineAdoption = await db.execute(sql`
    WITH distinct_workflows AS (
      SELECT DISTINCT ON (w.name) w.name, w.pipeline
      FROM workflows w JOIN repositories r ON w.repository_id = r.id
      WHERE r.full_name = ${fullName} AND w.name NOT IN ('CodeQL', 'Labeler')
    )
    SELECT CASE WHEN pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END AS "pipelineType",
      COUNT(*) AS "pipelineCount"
    FROM distinct_workflows
    GROUP BY CASE WHEN pipeline LIKE '%pagopa/dx%' THEN 'DX Pipelines' ELSE 'Non-DX Pipelines' END
    ORDER BY "pipelineType"
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
      THEN 'DX Terraform Modules' ELSE 'Non-DX Terraform Modules' END AS "moduleType",
      COUNT(*) AS "moduleCount"
    FROM distinct_modules
    GROUP BY CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%'
      THEN 'DX Terraform Modules' ELSE 'Non-DX Terraform Modules' END
    ORDER BY "moduleType"
  `);

  // Workflows List
  const workflowsList = await db.execute(sql`
    SELECT DISTINCT ON (w.name) w.name AS "workflowName",
      CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN '✓ DX' ELSE 'Non-DX' END AS "pipelineType"
    FROM workflows w JOIN repositories r ON w.repository_id = r.id
    WHERE r.full_name = ${fullName} AND w.name NOT IN ('CodeQL', 'Labeler')
    ORDER BY w.name, CASE WHEN w.pipeline LIKE '%pagopa/dx%' THEN 0 ELSE 1 END
  `);

  // Terraform Modules List
  const modulesList = await db.execute(sql`
    SELECT DISTINCT ON (module) module AS "moduleName",
      CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%' THEN '✓ DX' ELSE 'Non-DX' END AS "moduleType",
      file_path AS "filePath"
    FROM terraform_modules
    WHERE repository = ${fullName}
      AND module NOT LIKE './%' AND module NOT LIKE '../%'
    ORDER BY module, CASE WHEN module LIKE '%pagopa-dx%' OR module LIKE '%pagopa/dx%' THEN 0 ELSE 1 END
  `);

  // Version Drift: compare used version constraint vs latest available for DX modules
  const versionDriftList = await db.execute(sql`
    SELECT
      tm.module AS "moduleName",
      tm.version AS "usedVersion",
      trr.latest_version AS "latestVersion",
      tm.file_path AS "filePath",
      CASE
        WHEN tm.version IS NULL OR trr.latest_version IS NULL THEN 'unknown'
        WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
             = trr.major_version THEN 'up-to-date'
        WHEN (regexp_match(tm.version, '([0-9]+)'))[1]::integer
             < trr.major_version THEN 'outdated'
        ELSE 'unknown'
      END AS "driftStatus"
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
    ORDER BY "driftStatus" DESC, tm.module
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
        END AS "driftStatus"
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
      COUNT(*) FILTER (WHERE "driftStatus" = 'up-to-date') AS "upToDate",
      COUNT(*) FILTER (WHERE "driftStatus" = 'outdated') AS outdated,
      COUNT(*) FILTER (WHERE "driftStatus" = 'unknown') AS unknown,
      COUNT(*) AS total
    FROM drift
  `);

  const versionDriftSummaryRow = parseSqlRow(
    versionDriftSummaryRowSchema,
    versionDriftSummary.rows[0],
    "dx-adoption versionDriftSummary",
  );

  return {
    moduleAdoption: parseSqlRows(
      moduleAdoptionRowSchema,
      moduleAdoption.rows,
      "dx-adoption moduleAdoption",
    ),
    modulesList: parseSqlRows(
      moduleRowSchema,
      modulesList.rows,
      "dx-adoption modulesList",
    ),
    pipelineAdoption: parseSqlRows(
      pipelineAdoptionRowSchema,
      pipelineAdoption.rows,
      "dx-adoption pipelineAdoption",
    ),
    versionDriftList: parseSqlRows(
      versionDriftRowSchema,
      versionDriftList.rows,
      "dx-adoption versionDriftList",
    ),
    versionDriftSummary: {
      outdated: versionDriftSummaryRow.outdated ?? 0,
      total: versionDriftSummaryRow.total ?? 0,
      unknown: versionDriftSummaryRow.unknown ?? 0,
      upToDate: versionDriftSummaryRow.upToDate ?? 0,
    },
    workflowsList: parseSqlRows(
      workflowRowSchema,
      workflowsList.rows,
      "dx-adoption workflowsList",
    ),
  };
};
