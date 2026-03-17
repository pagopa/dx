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
          actualRequests: "4",
          requestDate: new Date("2026-03-10"),
          trend: "3.25",
        },
      ],
      "tracker frequency",
    ),
  ).toEqual([
    {
      actualRequests: 4,
      requestDate: "2026-03-10",
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
        newestRelease: new Date("2026-03-01"),
        oldestRelease: "2024-01-15",
        totalMajorVersions: "8",
        totalModules: "3",
        totalReleases: "21",
      },
      "releases stats",
    ),
  ).toEqual({
    newestRelease: "2026-03-01",
    oldestRelease: "2024-01-15",
    totalMajorVersions: 8,
    totalModules: 3,
    totalReleases: 21,
  });

  expect(
    parseSqlRows(
      moduleSummaryRowSchema,
      [
        {
          firstReleaseDate: "2024-01-15",
          lastReleaseDate: new Date("2026-03-01"),
          latestMajor: "4",
          majorVersionsCount: "4",
          moduleName: "storage-account",
          provider: "azure",
          totalReleases: "11",
          versionsDetail: "v1 (2), v2 (3), v3 (3), v4 (3)",
        },
      ],
      "releases modules",
    ),
  ).toEqual([
    {
      firstReleaseDate: "2024-01-15",
      lastReleaseDate: "2026-03-01",
      latestMajor: 4,
      majorVersionsCount: 4,
      moduleName: "storage-account",
      provider: "azure",
      totalReleases: 11,
      versionsDetail: "v1 (2), v2 (3), v3 (3), v4 (3)",
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
        upToDate: "3",
      },
      "dx-adoption summary",
    ),
  ).toEqual({
    outdated: 2,
    total: 5,
    unknown: null,
    upToDate: 3,
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
      { maxDate: new Date("2026-03-14T08:15:00.000Z") },
      "iac maxDate",
    ),
  ).toEqual({ maxDate: "2026-03-14T08:15:00.000Z" });

  expect(
    parseSqlRows(
      prsByReviewerRowSchema,
      [
        {
          avgLeadTimeDays: "2.5",
          mergedPrs: "4",
          reviewer: "alice",
          totalPrs: "6",
        },
      ],
      "iac prsByReviewer",
    ),
  ).toEqual([
    {
      avgLeadTimeDays: 2.5,
      mergedPrs: 4,
      reviewer: "alice",
      totalPrs: 6,
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
          changeRequests: "1",
          reviewer: "carol",
          totalReviews: "6",
        },
      ],
      "review distribution",
    ),
  ).toEqual([
    {
      approvals: 5,
      changeRequests: 1,
      reviewer: "carol",
      totalReviews: 6,
    },
  ]);

  expect(
    parseSqlRows(
      workflowDeploymentSchema,
      [
        {
          runWeek: new Date("2026-03-10T00:00:00.000Z"),
          weeklyDeploymentCount: "7",
        },
      ],
      "workflow deployments",
    ),
  ).toEqual([
    {
      runWeek: "2026-03-10T00:00:00.000Z",
      weeklyDeploymentCount: 7,
    },
  ]);

  expect(
    parseSqlRow(
      workflowSummarySchema,
      {
        avgDurationMinutes: null,
        firstPipelineDate: null,
        totalDurationMinutes: "34.5",
        totalPipelines: "9",
      },
      "workflow summary",
    ),
  ).toEqual({
    avgDurationMinutes: null,
    firstPipelineDate: null,
    totalDurationMinutes: 34.5,
    totalPipelines: 9,
  });

  expect(
    parseSqlRow(prMetricValueRowSchema, { value: "12" }, "pr metric"),
  ).toEqual({ value: 12 });

  expect(
    parseSqlRows(
      prCommentsBySizeRowSchema,
      [{ avgCommentsPerAddition: null, week: "2026-03-10" }],
      "pr comments by size",
    ),
  ).toEqual([{ avgCommentsPerAddition: null, week: "2026-03-10" }]);

  expect(
    parseSqlRows(
      slowestPrRowSchema,
      [
        {
          createdAt: new Date("2026-03-01T10:00:00.000Z"),
          leadTimeDays: "6.2",
          mergedAt: "2026-03-07T12:00:00.000Z",
          number: "42",
          title: "Add rollout validation",
        },
      ],
      "slowest prs",
    ),
  ).toEqual([
    {
      createdAt: "2026-03-01T10:00:00.000Z",
      leadTimeDays: 6.2,
      mergedAt: "2026-03-07T12:00:00.000Z",
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
