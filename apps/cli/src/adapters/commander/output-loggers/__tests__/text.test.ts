/**
 * Tests for TextOutputLogger.
 *
 * The TextOutputLogger wraps oraPromise for step feedback and chalk for
 * final output. Tests verify the observable behavior: tasks are executed,
 * values flow through, and errors surface correctly.
 */
import { describe, expect, it, vi } from "vitest";

// Mock oraPromise so tests don't spin up a real TTY spinner
vi.mock("ora", () => ({
  oraPromise: <T>(_promise: Promise<T>) => _promise,
}));

import { TextOutputLogger } from "../text.js";

describe("TextOutputLogger", () => {
  describe("runStep", () => {
    it("executes the task and returns its resolved value", async () => {
      const logger = new TextOutputLogger();
      const result = await logger.runStep("check terraform", () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
    });

    it("propagates task rejection as a thrown error", async () => {
      const logger = new TextOutputLogger();
      const error = new Error("terraform not found");
      await expect(
        logger.runStep("check terraform", () => Promise.reject(error)),
      ).rejects.toThrow("terraform not found");
    });

    it("can run multiple sequential steps", async () => {
      const logger = new TextOutputLogger();
      const order: string[] = [];
      await logger.runStep("step A", async () => {
        order.push("A");
      });
      await logger.runStep("step B", async () => {
        order.push("B");
      });
      expect(order).toEqual(["A", "B"]);
    });
  });

  describe("reportResult", () => {
    it("calls console.log without throwing", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
      const logger = new TextOutputLogger();
      expect(() =>
        logger.reportResult({ repository: { name: "my-repo" } }),
      ).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("reportError", () => {
    it("calls console.error without throwing", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const logger = new TextOutputLogger();
      expect(() =>
        logger.reportError(new Error("something failed")),
      ).not.toThrow();
      spy.mockRestore();
    });

    it("handles non-Error values without throwing", () => {
      const spy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const logger = new TextOutputLogger();
      expect(() => logger.reportError("plain string error")).not.toThrow();
      spy.mockRestore();
    });
  });
});
