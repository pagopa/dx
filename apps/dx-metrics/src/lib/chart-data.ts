/** Pure formatting and serialisation helpers shared by the chart components. */

const chartNumberFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 2,
});

/**
 * Formats a chart number, delegating to the caller's formatter when given so
 * tooltips, the data table and the CSV export all agree on one representation.
 */
export const formatChartNumber = (
  value: number,
  formatter?: (value: number) => string,
): string =>
  formatter
    ? formatter(value)
    : chartNumberFormatter.format(Number(value.toFixed(2)));

/**
 * Renders a single series cell for the tabular fallback: missing values become
 * an em dash, numbers are rounded (never a raw `3.6666666`), and the series unit
 * is appended so a bare number is not ambiguous.
 */
export const formatSeriesValue = (
  value: unknown,
  formatter?: (value: number) => string,
  unit?: string,
): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value === null || value === undefined ? "—" : String(value);
  }

  const formatted = formatChartNumber(value, formatter);
  return unit ? `${formatted} ${unit}` : formatted;
};

/** Quotes a CSV cell when it contains a delimiter, quote, or newline. */
export const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Serializes a chart's series into a spreadsheet-friendly CSV document. Series
 * headers and values carry the same unit as the chart and data table so the
 * export is not ambiguous.
 */
export const buildChartCsv = (
  data: readonly Record<string, unknown>[],
  series: readonly { key: string; name: string }[],
  xKey: string,
  formatter?: (value: number) => string,
  unit?: string,
): string => {
  const header = [
    xKey,
    ...series.map((entry) => (unit ? `${entry.name} (${unit})` : entry.name)),
  ]
    .map(csvCell)
    .join(",");
  const rows = data.map((row) =>
    [
      row[xKey],
      ...series.map((entry) =>
        formatSeriesValue(row[entry.key], formatter, unit),
      ),
    ]
      .map(csvCell)
      .join(","),
  );

  return [header, ...rows].join("\n");
};

/** Turns a chart title into a safe `.csv` file name. */
export const csvFileName = (chartTitle: string): string => {
  const slug = chartTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "chart"}.csv`;
};

/**
 * Sorts chart rows by a numeric key and optionally keeps the top N, so ranked
 * charts (Pareto-style) read from largest to smallest instead of alphabetically.
 * Non-numeric or missing values sort last regardless of direction.
 */
export const sortChartData = (
  data: readonly Record<string, unknown>[],
  sortKey?: string,
  sortDirection: "asc" | "desc" = "desc",
  maxItems?: number,
): Record<string, unknown>[] => {
  const numeric = (value: unknown): null | number => {
    // `Number(null)` and `Number("")` are both 0, which would sort missing
    // values as if they were real zeros; treat them as absent instead.
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sorted = sortKey
    ? [...data].sort((left, right) => {
        const leftValue = numeric(left[sortKey]);
        const rightValue = numeric(right[sortKey]);

        // Missing values always sink to the bottom, in either direction.
        if (leftValue === null && rightValue === null) {
          return 0;
        }
        if (leftValue === null) {
          return 1;
        }
        if (rightValue === null) {
          return -1;
        }

        return sortDirection === "asc"
          ? leftValue - rightValue
          : rightValue - leftValue;
      })
    : [...data];

  return maxItems === undefined
    ? sorted
    : sorted.slice(0, Math.max(0, maxItems));
};
