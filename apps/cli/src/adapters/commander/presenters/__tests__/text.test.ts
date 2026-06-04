/**
 * Tests for TextCommandPresenter.
 *
 * The TextCommandPresenter wraps oraPromise for step feedback and chalk for
 * final output. Tests verify the observable behavior: tasks are executed,
 * values flow through, and errors surface correctly.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock oraPromise so tests don't spin up a real TTY spinner
vi.mock("ora", () => ({
  oraPromise: <T>(_promise: Promise<T>) => _promise,
}));

import { TextCommandPresenter } from "../text-command-presenter.js";

describe("TextCommandPresenter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("trackStep", () => {
    it("executes the task and returns its resolved value", async () => {
      const logger = new TextCommandPresenter();
      const result = await logger.trackStep("check terraform", () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
    });

    it("propagates task rejection as a thrown error", async () => {
      const logger = new TextCommandPresenter();
      const error = new Error("terraform not found");
      await expect(
        logger.trackStep("check terraform", () => Promise.reject(error)),
      ).rejects.toThrow("terraform not found");
    });

    it("can run multiple sequential steps", async () => {
      const logger = new TextCommandPresenter();
      const order: string[] = [];
      await logger.trackStep("step A", async () => {
        order.push("A");
      });
      await logger.trackStep("step B", async () => {
        order.push("B");
      });
      expect(order).toEqual(["A", "B"]);
    });
  });

  describe("reportResult", () => {
    it("calls console.log without throwing", () => {
      vi.spyOn(console, "log").mockImplementation(() => undefined);
      const logger = new TextCommandPresenter();
      expect(() =>
        logger.reportResult({ repository: { name: "my-repo" } }),
      ).not.toThrow();
    });
  });

  describe("reportError", () => {
    it("calls console.error without throwing", () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const logger = new TextCommandPresenter();
      expect(() =>
        logger.reportError(new Error("something failed")),
      ).not.toThrow();
    });

    it("handles non-Error values without throwing", () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const logger = new TextCommandPresenter();
      expect(() => logger.reportError("plain string error")).not.toThrow();
    });
  });
});
