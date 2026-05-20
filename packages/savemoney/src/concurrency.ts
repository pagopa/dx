/**
 * Concurrency limiter — thin wrapper around `p-limit`.
 *
 * Exposes a stable `createLimiter` / `Limiter` API used throughout the
 * package, while delegating the actual implementation to the well-tested
 * `p-limit` library.
 *
 * Usage:
 *   const limit = createLimiter(8);
 *   await Promise.all(items.map(item => limit(() => doWork(item))));
 */

import pLimit from "p-limit";

export type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * Creates a limiter that runs at most `concurrency` async tasks in parallel.
 *
 * A concurrency of `0` or less is normalised to `1` before being passed to
 * `p-limit` (which requires a minimum of 1 and throws otherwise).
 */
export function createLimiter(concurrency: number): Limiter {
  return pLimit(Math.max(1, Math.floor(concurrency)));
}
