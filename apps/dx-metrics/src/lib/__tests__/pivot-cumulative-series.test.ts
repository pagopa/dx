import { describe, expect, it } from "vitest";

import { pivotCumulativeSeries } from "../pivot-cumulative-series.js";

const LABEL_KEY = "pipelineType" as const;

const LABEL_TO_SERIES = {
  "DX Pipelines": "dx",
  "Non-DX Pipelines": "nonDx",
} as const;

interface PivotCumulativeSeriesTestRow {
  cumulativeCount: number;
  pipelineType: keyof typeof LABEL_TO_SERIES;
  runDate: string;
}

describe("pivotCumulativeSeries", () => {
  it("returns empty array for empty input", () => {
    expect(pivotCumulativeSeries([], LABEL_KEY, LABEL_TO_SERIES)).toEqual([]);
  });

  it("pivots rows into one object per date with series as keys", () => {
    const rows = [
      {
        cumulativeCount: 5,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-01",
      },
      {
        cumulativeCount: 3,
        pipelineType: "Non-DX Pipelines",
        runDate: "2024-01-01",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ dx: 5, nonDx: 3, runDate: "2024-01-01" });
  });

  it("sorts output by runDate ascending", () => {
    const rows = [
      {
        cumulativeCount: 10,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-03",
      },
      {
        cumulativeCount: 2,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-01",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result[0].runDate).toBe("2024-01-01");
    expect(result[1].runDate).toBe("2024-01-03");
  });

  it("forward-fills zeros with the previous non-zero value", () => {
    const rows = [
      {
        cumulativeCount: 5,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-01",
      },
      {
        cumulativeCount: 7,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-02",
      },
      // Non-DX is missing on 2024-01-02 — should forward-fill from 2024-01-01
      {
        cumulativeCount: 3,
        pipelineType: "Non-DX Pipelines",
        runDate: "2024-01-01",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result).toHaveLength(2);
    // 2024-01-01: both present
    expect(result[0]).toMatchObject({ dx: 5, nonDx: 3 });
    // 2024-01-02: nonDx was zero — forward-filled to 3
    expect(result[1]).toMatchObject({ dx: 7, nonDx: 3 });
  });

  it("does not forward-fill when previous value is also zero", () => {
    const rows = [
      {
        cumulativeCount: 0,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-01",
      },
      {
        cumulativeCount: 0,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-02",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result[1]).toMatchObject({ dx: 0 });
  });

  it("skips rows with unknown label values", () => {
    const rows: PivotCumulativeSeriesTestRow[] = [
      {
        cumulativeCount: 10,
        // @ts-expect-error — intentionally invalid label to test runtime filtering
        pipelineType: "Unknown",
        runDate: "2024-01-01",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result).toHaveLength(0);
  });

  it("initialises missing series keys to 0 for a given date", () => {
    const rows = [
      {
        cumulativeCount: 4,
        pipelineType: "DX Pipelines",
        runDate: "2024-01-01",
      },
    ];

    const result = pivotCumulativeSeries(rows, LABEL_KEY, LABEL_TO_SERIES);

    expect(result[0]).toMatchObject({ dx: 4, nonDx: 0 });
  });
});
