/** Tests SQL result parsing schemas used by database dashboard adapters. */

import { expect, it } from "vitest";

import {
  copilotAuthoredPrRowSchema,
  copilotCardsSchema,
  copilotCoauthorLeadTimeRowSchema,
  copilotCoverageTrendRowSchema,
  copilotPrSizeRowSchema,
  copilotReviewCombinationSchema,
} from "@/adapters/db/copilot/schemas";
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
  prCommentsRowSchema,
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
  workflowTriggerTypeSchema,
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
        failedDurationMinutes: null,
        firstPipelineDate: null,
        previousAvgDurationMinutes: "12.5",
        previousFailedDurationMinutes: null,
        previousTotalDurationMinutes: "30.5",
        previousTotalPipelines: "8",
        totalDurationMinutes: "34.5",
        totalPipelines: "9",
      },
      "workflow summary",
    ),
  ).toEqual({
    avgDurationMinutes: null,
    failedDurationMinutes: null,
    firstPipelineDate: null,
    previousAvgDurationMinutes: 12.5,
    previousFailedDurationMinutes: null,
    previousTotalDurationMinutes: 30.5,
    previousTotalPipelines: 8,
    totalDurationMinutes: 34.5,
    totalPipelines: 9,
  });

  expect(
    parseSqlRows(
      workflowTriggerTypeSchema,
      [{ runCount: "8", triggerType: "Automatic" }],
      "workflow trigger types",
    ),
  ).toEqual([{ runCount: 8, triggerType: "Automatic" }]);

  expect(
    parseSqlRow(prMetricValueRowSchema, { value: "12" }, "pr metric"),
  ).toEqual({ value: 12 });

  expect(
    parseSqlRows(
      prCommentsRowSchema,
      [{ avgComments: "3.5", week: "2026-03-10" }],
      "pr comments",
    ),
  ).toEqual([{ avgComments: 3.5, week: "2026-03-10" }]);

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

it("parses Copilot dashboard rows", () => {
  expect(
    parseSqlRow(
      copilotCardsSchema,
      {
        avgLeadTimeHoursWith: "140.01",
        avgLeadTimeHoursWithout: "71.87",
        copilotAuthoredMergedPrs: "5",
        copilotAuthoredPrs: "10",
        copilotCoauthoredCommits: "146",
        copilotReviewedPrs: "476",
        coauthoredCommitShare: "0.105",
        coverageShare: "0.3182",
        mergedPrs: "1496",
        previousCopilotAuthoredPrs: "0",
        previousCopilotCoauthoredCommits: "3",
        previousCopilotReviewedPrs: null,
        previousCoverageShare: null,
        previousLeadTimeHoursWith: "120.5",
        totalTeamCommits: "1406",
      },
      "copilot cards",
    ),
  ).toEqual({
    avgLeadTimeHoursWith: 140.01,
    avgLeadTimeHoursWithout: 71.87,
    copilotAuthoredMergedPrs: 5,
    copilotAuthoredPrs: 10,
    copilotCoauthoredCommits: 146,
    copilotReviewedPrs: 476,
    coauthoredCommitShare: 0.105,
    coverageShare: 0.3182,
    mergedPrs: 1496,
    previousCopilotAuthoredPrs: 0,
    previousCopilotCoauthoredCommits: 3,
    previousCopilotReviewedPrs: null,
    previousCoverageShare: null,
    previousLeadTimeHoursWith: 120.5,
    totalTeamCommits: 1406,
  });

  expect(
    parseSqlRow(
      copilotReviewCombinationSchema,
      {
        copilotAndHuman: "474",
        copilotOnly: "3",
        humanOnly: "1257",
        noReview: "43",
      },
      "copilot reviewCombination",
    ),
  ).toEqual({
    copilotAndHuman: 474,
    copilotOnly: 3,
    humanOnly: 1257,
    noReview: 43,
  });

  expect(
    parseSqlRow(
      copilotPrSizeRowSchema,
      {
        bucket: "200-499",
        copilotReviewedPrs: "85",
        mergedPrs: "186",
        reviewRate: "45.7",
      },
      "copilot prSizeBuckets",
    ),
  ).toEqual({
    bucket: "200-499",
    copilotReviewedPrs: 85,
    mergedPrs: 186,
    reviewRate: 45.7,
  });

  expect(
    parseSqlRow(
      copilotCoauthorLeadTimeRowSchema,
      { avgLeadTimeDays: "2.25", coauthoredCommits: "2", week: "2026-09-07" },
      "copilot coauthorLeadTimeTrend",
    ),
  ).toEqual({
    avgLeadTimeDays: 2.25,
    coauthoredCommits: 2,
    week: "2026-09-07",
  });

  expect(
    parseSqlRow(
      copilotCoverageTrendRowSchema,
      { cumulativeWith: "477", cumulativeWithout: "1391", week: "2026-09-14" },
      "copilot coverageTrend",
    ),
  ).toEqual({
    cumulativeWith: 477,
    cumulativeWithout: 1391,
    week: "2026-09-14",
  });

  expect(
    parseSqlRow(
      copilotAuthoredPrRowSchema,
      {
        createdAt: new Date("2025-09-23T11:01:18.000Z"),
        leadTimeDays: "0.25",
        mergedAt: new Date("2025-09-23T16:59:36.000Z"),
        number: "906",
        repository: "pagopa/dx",
        title: "Remove dx catalog from pnpm-plugin-pagopa",
      },
      "copilot recentAuthoredPrs",
    ),
  ).toEqual({
    createdAt: "2025-09-23T11:01:18.000Z",
    leadTimeDays: 0.25,
    mergedAt: "2025-09-23T16:59:36.000Z",
    number: 906,
    repository: "pagopa/dx",
    title: "Remove dx catalog from pnpm-plugin-pagopa",
  });
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
