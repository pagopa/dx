/** Tests for DX team insight rules. */

import { describe, expect, it } from "vitest";

import { buildDxTeamInsights } from "@/lib/insights/dx-team";

describe("buildDxTeamInsights", () => {
  it("reports external contributions and a concentrated workload", () => {
    const insights = buildDxTeamInsights({
      commitsByRepo: [
        {
          fullName: "pagopa/io-app",
          memberName: "alice",
          repositoryCommits: 8,
        },
        { fullName: "pagopa/io-app", memberName: "bob", repositoryCommits: 2 },
      ],
      dxPipelinesUsage: [
        { dxPath: "pagopa/dx/.github/workflows/x.yaml", repositoryCount: 3 },
      ],
      ioInfraPrs: [{ dxPr: 2, nonDxPr: 8 }],
    });

    expect(
      insights.find((insight) => insight.id === "dx-team-bus-factor")?.severity,
    ).toBe("warning");
    expect(
      insights.find((insight) => insight.id === "dx-team-io-infra-external")
        ?.value?.current,
    ).toBe(80);
  });

  it("returns no insights for empty input", () => {
    expect(
      buildDxTeamInsights({
        commitsByRepo: [],
        dxPipelinesUsage: [],
        ioInfraPrs: [],
      }),
    ).toEqual([]);
  });
});
