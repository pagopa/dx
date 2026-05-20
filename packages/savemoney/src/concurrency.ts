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
 *
 * ## Slot hand-off (race-condition-free design)
 *
 * When a running task finishes and there is a queued waiter, the slot is
 * *handed off* directly to the waiter — `active` is **not** decremented.
 * The waiter resumes without incrementing `active` again, so the count
 * stays correct and no two concurrent callers can ever claim the same slot.
 * Only when there is no waiter does `active` actually decrement.
 */
export function createLimiter(concurrency: number): Limiter {
  const max = Math.max(1, Math.floor(concurrency));
  let active = 0;
  // Each entry is a resolve callback for the Promise a queued caller is
  // suspended on. Resolving it wakes the caller, which then owns the slot
  // that was handed off by the finishing task.
  const queue: (() => void)[] = [];

  // Called when a task completes. Either hands the slot to the next queued
  // caller (active stays the same) or releases it (active--).
  const releaseSlot = () => {
    const resume = queue.shift();
    if (resume) {
      // Hand the slot off: the waiter owns it now — do NOT decrement active.
      resume();
    } else {
      active--;
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      // Park until a slot is handed off to us.
      await new Promise<void>((resolve) => queue.push(resolve));
      // Slot is already counted: the previous task handed it off without
      // decrementing active, so we must NOT increment here.
    } else {
      // Claim an available slot.
      active++;
    }
    try {
      return await fn();
    } finally {
      releaseSlot();
    }
  };
}
