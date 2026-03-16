/** Tests SQL result parsing schemas used by database dashboard adapters. */

import { expect, it } from "vitest";

import { versionDriftSummaryRowSchema } from "@/adapters/db/dx-adoption/schemas";
import {
  dxMemberRowSchema,
  maxDateRowSchema,
  prsByReviewerRowSchema,
} from "@/adapters/db/iac/schemas";
import {
  reviewDistributionRowSchema,
  reviewMetricValueRowSchema,
} from "@/adapters/db/pull-requests-review/schemas";
import {
  prCommentsBySizeRowSchema,
  prMetricValueRowSchema,
  slowestPrRowSchema,
} from "@/adapters/db/pull-requests/schemas";
import {
  moduleSummaryRowSchema,
  releaseStatsRowSchema,
} from "@/adapters/db/releases/schemas";
import {
  parseSqlRow,
  parseSqlRows,
  sqlDateSchema,
  sqlNumberSchema,
  sqlTimestampSchema,
} from "@/adapters/db/shared/sql-parsing";
import {
  categoryRowSchema,
  frequencyTrendRowSchema,
  trackerMetricValueRowSchema,
} from "@/adapters/db/tracker/schemas";
import {
  workflowDeploymentSchema,
  workflowSummarySchema,
} from "@/adapters/db/workflows/schemas";

it("coerces shared scalar SQL values", () => {
  expect(parseSqlRow(sqlNumberSchema, "12.5", "number")).toBe(12.5);
  expect(parseSqlRow(sqlDateSchema, new Date("2026-03-14"), "date")).toBe(
    "2026-03-14",
  );
  expect(
    parseSqlRow(
      sqlTimestampSchema,
      new Date("2026-03-14T12:30:00.000Z"),
      "timestamp",
    ),
  ).toBe("2026-03-14T12:30:00.000Z");
});

it("parses tracker rows and nullable metric values", () => {
  expect(
    parseSqlRows(
      categoryRowSchema,
      [{ category: "Bug", requests: "3" }],
      "tracker categories",
    ),
  ).toEqual([{ category: "Bug", requests: 3 }]);

  expect(
    parseSqlRows(
      frequencyTrendRowSchema,
      [
        {
          actual_requests: "4",
          request_date: new Date("2026-03-10"),
          trend: "3.25",
        },
      ],
      "tracker frequency",
    ),
  ).toEqual([
    {
      actual_requests: 4,
      request_date: "2026-03-10",
      trend: 3.25,
    },
  ]);

  expect(
    parseSqlRow(trackerMetricValueRowSchema, { value: null }, "tracker card"),
  ).toEqual({ value: null });
});

it("parses releases rows and date aggregates", () => {
  expect(
    parseSqlRow(
      releaseStatsRowSchema,
      {
        newest_release: new Date("2026-03-01"),
        oldest_release: "2024-01-15",
        total_major_versions: "8",
        total_modules: "3",
        total_releases: "21",
      },
      "releases stats",
    ),
  ).toEqual({
    newest_release: "2026-03-01",
    oldest_release: "2024-01-15",
    total_major_versions: 8,
    total_modules: 3,
    total_releases: 21,
  });

  expect(
    parseSqlRows(
      moduleSummaryRowSchema,
      [
        {
          first_release_date: "2024-01-15",
          last_release_date: new Date("2026-03-01"),
          latest_major: "4",
          major_versions_count: "4",
          module_name: "storage-account",
          provider: "azure",
          total_releases: "11",
          versions_detail: "v1 (2), v2 (3), v3 (3), v4 (3)",
        },
      ],
      "releases modules",
    ),
  ).toEqual([
    {
      first_release_date: "2024-01-15",
      last_release_date: "2026-03-01",
      latest_major: 4,
      major_versions_count: 4,
      module_name: "storage-account",
      provider: "azure",
      total_releases: 11,
      versions_detail: "v1 (2), v2 (3), v3 (3), v4 (3)",
    },
  ]);
});

it("parses dx-adoption and iac support rows", () => {
  expect(
    parseSqlRow(
      versionDriftSummaryRowSchema,
      {
        outdated: "2",
        total: "5",
        unknown: null,
        up_to_date: "3",
      },
      "dx-adoption summary",
    ),
  ).toEqual({
    outdated: 2,
    total: 5,
    unknown: null,
    up_to_date: 3,
  });

  expect(
    parseSqlRows(
      dxMemberRowSchema,
      [{ username: "alice" }, { username: "bob" }],
      "iac members",
    ),
  ).toEqual([{ username: "alice" }, { username: "bob" }]);

  expect(
    parseSqlRow(
      maxDateRowSchema,
      { max_date: new Date("2026-03-14T08:15:00.000Z") },
      "iac maxDate",
    ),
  ).toEqual({ max_date: "2026-03-14T08:15:00.000Z" });

  expect(
    parseSqlRows(
      prsByReviewerRowSchema,
      [
        {
          avg_lead_time_days: "2.5",
          merged_prs: "4",
          reviewer: "alice",
          total_prs: "6",
        },
      ],
      "iac prsByReviewer",
    ),
  ).toEqual([
    {
      avg_lead_time_days: 2.5,
      merged_prs: 4,
      reviewer: "alice",
      total_prs: 6,
    },
  ]);
});

it("parses review, workflow, and pull-request dashboard rows", () => {
  expect(
    parseSqlRow(reviewMetricValueRowSchema, { value: "4.75" }, "review metric"),
  ).toEqual({ value: 4.75 });

  expect(
    parseSqlRows(
      reviewDistributionRowSchema,
      [
        {
          approvals: "5",
          change_requests: "1",
          reviewer: "carol",
          total_reviews: "6",
        },
      ],
      "review distribution",
    ),
  ).toEqual([
    {
      approvals: 5,
      change_requests: 1,
      reviewer: "carol",
      total_reviews: 6,
    },
  ]);

  expect(
    parseSqlRows(
      workflowDeploymentSchema,
      [
        {
          run_week: new Date("2026-03-10T00:00:00.000Z"),
          weekly_deployment_count: "7",
        },
      ],
      "workflow deployments",
    ),
  ).toEqual([
    {
      run_week: "2026-03-10T00:00:00.000Z",
      weekly_deployment_count: 7,
    },
  ]);

  expect(
    parseSqlRow(
      workflowSummarySchema,
      {
        avg_duration_minutes: null,
        first_pipeline_date: null,
        total_duration_minutes: "34.5",
        total_pipelines: "9",
      },
      "workflow summary",
    ),
  ).toEqual({
    avg_duration_minutes: null,
    first_pipeline_date: null,
    total_duration_minutes: 34.5,
    total_pipelines: 9,
  });

  expect(
    parseSqlRow(prMetricValueRowSchema, { value: "12" }, "pr metric"),
  ).toEqual({ value: 12 });

  expect(
    parseSqlRows(
      prCommentsBySizeRowSchema,
      [{ avg_comments_per_addition: null, week: "2026-03-10" }],
      "pr comments by size",
    ),
  ).toEqual([{ avg_comments_per_addition: null, week: "2026-03-10" }]);

  expect(
    parseSqlRows(
      slowestPrRowSchema,
      [
        {
          created_at: new Date("2026-03-01T10:00:00.000Z"),
          lead_time_days: "6.2",
          merged_at: "2026-03-07T12:00:00.000Z",
          number: "42",
          title: "Add rollout validation",
        },
      ],
      "slowest prs",
    ),
  ).toEqual([
    {
      created_at: "2026-03-01T10:00:00.000Z",
      lead_time_days: 6.2,
      merged_at: "2026-03-07T12:00:00.000Z",
      number: 42,
      title: "Add rollout validation",
    },
  ]);
});

it("throws a descriptive error when a SQL row does not match the schema", () => {
  expect(() =>
    parseSqlRows(
      categoryRowSchema,
      [{ category: "Bug", requests: "oops" }],
      "tracker categories",
    ),
  ).toThrowError(
    "Invalid SQL result for tracker categories: 0.requests: Invalid input: expected number, received NaN",
  );
});
