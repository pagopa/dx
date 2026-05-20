/**
 * Tiny concurrency limiter — drop-in for the small subset of `p-limit`
 * we need, without adding an external dependency.
 *
 * Usage:
 *   const limit = createLimiter(8);
 *   await Promise.all(items.map(item => limit(() => doWork(item))));
 */

export type Limiter = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * Creates a limiter that runs at most `concurrency` async tasks in parallel.
 *
 * A concurrency of `0` or less is normalised to `1`. There is no upper
 * bound — pick a sensible default at the call site.
 */
export function createLimiter(concurrency: number): Limiter {
  const max = Math.max(1, Math.floor(concurrency));
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    active--;
    const resume = queue.shift();
    if (resume) {
      resume();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}
