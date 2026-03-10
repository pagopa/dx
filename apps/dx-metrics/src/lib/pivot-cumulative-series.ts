/** Builds chart-ready cumulative series data with forward-filled gaps. */
type CumulativeSeriesRow<TLabelKey extends string> = {
  run_date: string;
  cumulative_count: number;
} & Record<TLabelKey, string>;

const buildEmptyPoint = (
  date: string,
  seriesKeys: readonly string[],
): Record<string, string | number> => {
  const point: Record<string, string | number> = { run_date: date };

  for (const seriesKey of seriesKeys) {
    point[seriesKey] = 0;
  }

  return point;
};

/**
 * Pivots cumulative series data for charting, forward-filling gaps.
 */
export function pivotCumulativeSeries<
  TLabelKey extends string,
  TSeriesKey extends string,
>(
  rows: ReadonlyArray<CumulativeSeriesRow<TLabelKey>>,
  labelKey: TLabelKey,
  labelToSeries: Readonly<Record<string, TSeriesKey>>,
) {
  const seriesKeys = Array.from(new Set(Object.values(labelToSeries)));
  const pointsByDate = new Map<string, Record<string, string | number>>();

  for (const row of rows) {
    const seriesKey = labelToSeries[row[labelKey]];

    if (!seriesKey) {
      continue;
    }

    const point =
      pointsByDate.get(row.run_date) ??
      buildEmptyPoint(row.run_date, seriesKeys);

    point[seriesKey] = Number(row.cumulative_count);
    pointsByDate.set(row.run_date, point);
  }

  const points = Array.from(pointsByDate.values()).toSorted((left, right) =>
    String(left.run_date).localeCompare(String(right.run_date)),
  );

  for (let index = 1; index < points.length; index += 1) {
    for (const seriesKey of seriesKeys) {
      const currentValue = Number(points[index][seriesKey] ?? 0);
      const previousValue = Number(points[index - 1][seriesKey] ?? 0);

      if (currentValue === 0 && previousValue > 0) {
        points[index][seriesKey] = previousValue;
      }
    }
  }

  return points;
}
