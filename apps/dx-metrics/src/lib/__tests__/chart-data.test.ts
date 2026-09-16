/** Tests for the pure chart formatting and serialisation helpers. */

import { describe, expect, it } from "vitest";

import {
  buildChartCsv,
  csvFileName,
  formatChartNumber,
  formatSeriesValue,
  sortChartData,
} from "@/lib/chart-data";

describe("formatChartNumber", () => {
  it("rounds to at most two decimals", () => {
    expect(formatChartNumber(3.6666666)).toBe("3.67");
  });

  it("groups thousands", () => {
    expect(formatChartNumber(1234.5)).toBe("1,234.5");
  });

  it("prefers the caller formatter when given", () => {
    expect(formatChartNumber(3.6, (value) => value.toFixed(0))).toBe("4");
  });
});

describe("formatSeriesValue", () => {
  it("renders a placeholder for missing values", () => {
    expect(formatSeriesValue(null)).toBe("—");
    expect(formatSeriesValue(undefined)).toBe("—");
  });

  it("appends the unit to numeric values", () => {
    expect(formatSeriesValue(3.6666, undefined, "days")).toBe("3.67 days");
  });

  it("passes non-numeric values through", () => {
    expect(formatSeriesValue("n/a")).toBe("n/a");
  });
});

describe("buildChartCsv", () => {
  it("rounds values and keeps a plain header", () => {
    const csv = buildChartCsv(
      [{ week: "2026-01-01", value: 3.6666 }],
      [{ key: "value", name: "Value" }],
      "week",
    );

    expect(csv).toBe("week,Value\n2026-01-01,3.67");
  });

  it("quotes cells containing a delimiter", () => {
    const csv = buildChartCsv(
      [{ name: "a,b", value: 1 }],
      [{ key: "value", name: "Value" }],
      "name",
    );

    expect(csv.split("\n")[1]).toBe('"a,b",1');
  });

  it("carries the unit in the header and values, matching the data table", () => {
    const csv = buildChartCsv(
      [{ week: "2026-01-01", value: 3.6666 }],
      [{ key: "value", name: "Value" }],
      "week",
      undefined,
      "days",
    );

    expect(csv).toBe("week,Value (days)\n2026-01-01,3.67 days");
  });
});

describe("csvFileName", () => {
  it("slugifies the chart title", () => {
    expect(csvFileName("Mean Lead Time (Weekly)")).toBe(
      "mean-lead-time-weekly.csv",
    );
  });

  it("falls back when the title has no usable characters", () => {
    expect(csvFileName("!!!")).toBe("chart.csv");
  });
});

describe("sortChartData", () => {
  const data = [
    { name: "a", value: 1 },
    { name: "b", value: 3 },
    { name: "c", value: null },
  ];

  it("sorts descending by default and sinks missing values", () => {
    expect(sortChartData(data, "value").map((row) => row.name)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("sorts ascending when requested", () => {
    expect(sortChartData(data, "value", "asc").map((row) => row.name)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps only the top N after sorting", () => {
    expect(sortChartData(data, "value", "desc", 1)).toHaveLength(1);
    expect(sortChartData(data, "value", "desc", 1)[0].name).toBe("b");
  });

  it("does not mutate the input", () => {
    const original = [...data];
    sortChartData(data, "value");
    expect(data).toEqual(original);
  });
});
