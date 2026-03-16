/** Builds chart-ready cumulative series data with forward-filled gaps. */
type CumulativeSeriesRow<TLabelKey extends string> = Record<
  TLabelKey,
  string
> & {
  cumulativeCount: number;
  runDate: string;
};

const buildEmptyPoint = (
  date: string,
  seriesKeys: readonly string[],
): Record<string, number | string> => {
  const point: Record<string, number | string> = { runDate: date };

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
  rows: readonly CumulativeSeriesRow<TLabelKey>[],
  labelKey: TLabelKey,
  labelToSeries: Readonly<Record<string, TSeriesKey>>,
) {
  const seriesKeys = Array.from(new Set(Object.values(labelToSeries)));
  const pointsByDate = new Map<string, Record<string, number | string>>();

  for (const row of rows) {
    const seriesKey = labelToSeries[row[labelKey]];

    if (!seriesKey) {
      continue;
    }

    const point =
      pointsByDate.get(row.runDate) ?? buildEmptyPoint(row.runDate, seriesKeys);

    point[seriesKey] = Number(row.cumulativeCount);
    pointsByDate.set(row.runDate, point);
  }

  const points = Array.from(pointsByDate.values()).toSorted((left, right) =>
    String(left.runDate).localeCompare(String(right.runDate)),
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
