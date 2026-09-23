/** Pure statistical helpers shared by dashboard insight rules. */

/** A single `(x, y)` observation used for trend fitting. */
export interface TrendPoint {
  readonly x: number;
  readonly y: number;
}

/** Result of a least-squares linear regression over a set of points. */
export interface LinearRegression {
  readonly intercept: number;
  readonly rSquared: number;
  readonly slope: number;
}

/** Divides two numbers, returning `null` for a zero or non-finite denominator. */
export const safeDivide = (
  numerator: number,
  denominator: number,
): number | null => {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
};

/** Percentage change from `previous` to `current`, or `null` if not computable. */
export const percentChange = (
  current: number,
  previous: number,
): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }

  // A move away from zero has no meaningful percentage.
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Least-squares regression for `y = slope * x + intercept`.
 * Returns `null` when there are fewer than two distinct x values.
 */
export const linearRegression = (
  points: readonly TrendPoint[],
): LinearRegression | null => {
  const usable = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );

  if (usable.length < 2) {
    return null;
  }

  const count = usable.length;
  const meanX = usable.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = usable.reduce((sum, point) => sum + point.y, 0) / count;

  const varianceX = usable.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0,
  );

  if (varianceX === 0) {
    return null;
  }

  const covariance = usable.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;

  const totalVariance = usable.reduce(
    (sum, point) => sum + (point.y - meanY) ** 2,
    0,
  );
  const residualVariance = usable.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + (point.y - predicted) ** 2;
  }, 0);

  const rSquared =
    totalVariance === 0 ? 1 : 1 - residualVariance / totalVariance;

  return { intercept, rSquared, slope };
};

/**
 * Share of the total (0..1) contributed by the largest `fraction` of values.
 * Example: `paretoShare(values, 0.1)` answers "how much do the slowest 10%
 * account for?". Returns `null` when there is no positive total.
 */
export const paretoShare = (
  values: readonly number[],
  fraction: number,
): number | null => {
  const positive = values.filter((value) => value > 0);

  if (positive.length === 0 || fraction <= 0) {
    return null;
  }

  const sorted = [...positive].sort((left, right) => right - left);
  const take = Math.max(1, Math.ceil(sorted.length * Math.min(fraction, 1)));
  const topSum = sorted.slice(0, take).reduce((sum, value) => sum + value, 0);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return safeDivide(topSum, total);
};

/** Share (0..1) of `numerator` over `denominator`, or `null` if not computable. */
export const share = (
  numerator: number,
  denominator: number,
): number | null => {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : ratio;
};

/** Median (p50) of a numeric list, or `null` for an empty list. */
export const median = (values: readonly number[]): number | null => {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .slice()
    .sort((left, right) => left - right);

  if (sorted.length === 0) {
    return null;
  }

  const midpoint = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
};

/**
 * Fraction (0..1) of `values` that are less than or equal to `value`.
 * Answers "at which percentile does this repository sit?".
 */
export const percentileRank = (
  value: number,
  values: readonly number[],
): number | null => {
  const clean = values.filter((candidate) => Number.isFinite(candidate));

  if (clean.length === 0) {
    return null;
  }

  const below = clean.filter((candidate) => candidate <= value).length;

  return below / clean.length;
};
