/**
 * Tests for createLimiter — verifies the concurrency limiter semantics.
 *
 * Behaviours covered:
 * 1. Concurrency cap is never exceeded (active tasks ≤ max at all times).
 * 2. All queued tasks are eventually executed.
 * 3. Results are returned correctly from the wrapped function.
 * 4. A concurrency of 0 or negative is normalised to 1 (fully sequential).
 * 5. An error thrown by a task propagates to the caller without breaking
 *    the limiter — subsequent tasks still run.
 * 6. Tasks run in FIFO order relative to when they were enqueued.
 */

import { describe, expect, it } from "vitest";

import { createLimiter } from "../concurrency.js";

/** Resolves after `ms` milliseconds. Useful to control task ordering. */
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("createLimiter", () => {
  describe("concurrency cap", () => {
    it("never exceeds the configured max concurrency", async () => {
      const max = 3;
      const limit = createLimiter(max);
      let active = 0;
      let peakActive = 0;
      const tasks = 12;

      await Promise.all(
        Array.from({ length: tasks }, () =>
          limit(async () => {
            active++;
            peakActive = Math.max(peakActive, active);
            await delay(5);
            active--;
          }),
        ),
      );

      expect(peakActive).toBeLessThanOrEqual(max);
    });

    it("runs all tasks when count exceeds concurrency", async () => {
      const limit = createLimiter(2);
      let completed = 0;

      await Promise.all(
        Array.from({ length: 10 }, () =>
          limit(async () => {
            await delay(1);
            completed++;
          }),
        ),
      );

      expect(completed).toBe(10);
    });
  });

  describe("concurrency normalisation", () => {
    it("normalises 0 to 1 (sequential execution)", async () => {
      const limit = createLimiter(0);
      let active = 0;
      let peakActive = 0;

      await Promise.all(
        Array.from({ length: 4 }, () =>
          limit(async () => {
            active++;
            peakActive = Math.max(peakActive, active);
            await delay(1);
            active--;
          }),
        ),
      );

      expect(peakActive).toBe(1);
    });

    it("normalises negative values to 1", async () => {
      const limit = createLimiter(-5);
      let active = 0;
      let peakActive = 0;

      await Promise.all(
        Array.from({ length: 4 }, () =>
          limit(async () => {
            active++;
            peakActive = Math.max(peakActive, active);
            await delay(1);
            active--;
          }),
        ),
      );

      expect(peakActive).toBe(1);
    });
  });

  describe("return values", () => {
    it("returns the value produced by the wrapped function", async () => {
      const limit = createLimiter(2);
      const result = await limit(async () => 42);
      expect(result).toBe(42);
    });

    it("returns correct values for all tasks", async () => {
      const limit = createLimiter(2);
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((n) => limit(async () => n * 2)),
      );
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe("error handling", () => {
    it("propagates errors to the caller", async () => {
      const limit = createLimiter(2);
      await expect(
        limit(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    it("does not break the limiter after a task throws", async () => {
      const limit = createLimiter(1);
      let recovered = false;

      await limit(async () => {
        throw new Error("first task fails");
      }).catch(() => {});

      await limit(async () => {
        recovered = true;
      });

      expect(recovered).toBe(true);
    });

    it("runs remaining queued tasks even when one throws", async () => {
      const limit = createLimiter(1);
      const completed: number[] = [];

      await Promise.allSettled([
        limit(async () => {
          completed.push(1);
          throw new Error("fail");
        }),
        limit(async () => {
          completed.push(2);
        }),
        limit(async () => {
          completed.push(3);
        }),
      ]);

      expect(completed).toEqual([1, 2, 3]);
    });
  });

  describe("FIFO ordering", () => {
    it("executes queued tasks in the order they were submitted", async () => {
      // Concurrency 1 guarantees serial execution, making order observable.
      const limit = createLimiter(1);
      const order: number[] = [];

      await Promise.all(
        [1, 2, 3, 4, 5].map((n) =>
          limit(async () => {
            order.push(n);
          }),
        ),
      );

      expect(order).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
