/** Tests for DX team insight rules. */

import { describe, expect, it } from "vitest";

import { buildDxTeamInsights } from "@/lib/insights/dx-team";

describe("buildDxTeamInsights", () => {
  it("reports external contributions and a concentrated workload", () => {
    const insights = buildDxTeamInsights({
      dxCommits: [
        { memberName: "alice", repositoryCommits: 8 },
        { memberName: "bob", repositoryCommits: 2 },
      ],
      dxPipelinesUsage: [
        { dxPath: "pagopa/dx/.github/workflows/x.yaml", repositoryCount: 3 },
      ],
      ioInfraPrs: [{ dxPr: 2, nonDxPr: 8 }],
    });

    const busFactor = insights.find(
      (insight) => insight.id === "dx-team-bus-factor",
    );

    expect(busFactor?.severity).toBe("warning");
    expect(busFactor?.detail).toBe(
      "alice accounts for 80% of the 10 DX commits on non-DX repositories.",
    );
    expect(busFactor?.value?.current).toBe(80);
    expect(
      insights.find((insight) => insight.id === "dx-team-io-infra-external")
        ?.value?.current,
    ).toBe(80);
  });

  it("omits the bus-factor insight when there are no non-DX commits", () => {
    const insights = buildDxTeamInsights({
      dxCommits: [],
      dxPipelinesUsage: [],
      ioInfraPrs: [{ dxPr: 1, nonDxPr: 1 }],
    });

    expect(
      insights.find((insight) => insight.id === "dx-team-bus-factor"),
    ).toBeUndefined();
  });

  it("returns no insights for empty input", () => {
    expect(
      buildDxTeamInsights({
        dxCommits: [],
        dxPipelinesUsage: [],
        ioInfraPrs: [],
      }),
    ).toEqual([]);
  });
});
