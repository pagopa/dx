/**
 * Tests for JsonOutputLogger.
 *
 * JsonOutputLogger emits NDJSON step events to stderr and a single JSON
 * result or error envelope to stdout. Tests verify the wire format and
 * that values flow through correctly.
 */
import { describe, expect, it, vi } from "vitest";

import { JsonOutputLogger } from "../json.js";

const captureStderr = () => {
  const events: string[] = [];
  const spy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((data: unknown) => {
      events.push(String(data));
      return true;
    });
  return { events, restore: () => spy.mockRestore() };
};

const captureStdout = () => {
  const written: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((data: unknown) => {
      written.push(String(data));
      return true;
    });
  return { restore: () => spy.mockRestore(), written };
};

describe("JsonOutputLogger", () => {
  describe("runStep", () => {
    it("executes the task and returns its resolved value", async () => {
      const stderr = captureStderr();
      const logger = new JsonOutputLogger();
      const result = await logger.runStep("check terraform", () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
      stderr.restore();
    });

    it("emits start then success events to stderr", async () => {
      const stderr = captureStderr();
      const logger = new JsonOutputLogger();
      await logger.runStep("check terraform", () => Promise.resolve("done"));
      expect(stderr.events).toHaveLength(2);
      expect(JSON.parse(stderr.events[0])).toMatchObject({
        name: "check terraform",
        status: "start",
        type: "step",
      });
      expect(JSON.parse(stderr.events[1])).toMatchObject({
        name: "check terraform",
        status: "success",
        type: "step",
      });
      stderr.restore();
    });

    it("emits error event to stderr and rethrows on task failure", async () => {
      const stderr = captureStderr();
      const logger = new JsonOutputLogger();
      const error = new Error("terraform not found");
      await expect(
        logger.runStep("check terraform", () => Promise.reject(error)),
      ).rejects.toThrow("terraform not found");
      expect(JSON.parse(stderr.events[1])).toMatchObject({
        error: "terraform not found",
        name: "check terraform",
        status: "error",
        type: "step",
      });
      stderr.restore();
    });

    it("can run multiple sequential steps", async () => {
      const stderr = captureStderr();
      const logger = new JsonOutputLogger();
      const order: string[] = [];
      await logger.runStep("step A", async () => {
        order.push("A");
      });
      await logger.runStep("step B", async () => {
        order.push("B");
      });
      expect(order).toEqual(["A", "B"]);
      stderr.restore();
    });
  });

  describe("reportResult", () => {
    it("emits an ok:true JSON envelope to stdout", () => {
      const stdout = captureStdout();
      const logger = new JsonOutputLogger();
      logger.reportResult({ repository: { name: "my-repo" } });
      expect(JSON.parse(stdout.written[0])).toEqual({
        data: { repository: { name: "my-repo" } },
        ok: true,
      });
      stdout.restore();
    });
  });

  describe("reportError", () => {
    it("emits an ok:false JSON envelope to stdout", () => {
      const stdout = captureStdout();
      const logger = new JsonOutputLogger();
      logger.reportError(new Error("something failed"));
      expect(JSON.parse(stdout.written[0])).toMatchObject({
        error: "something failed",
        ok: false,
      });
      stdout.restore();
    });

    it("handles non-Error values without throwing", () => {
      const stdout = captureStdout();
      const logger = new JsonOutputLogger();
      expect(() => logger.reportError("plain string error")).not.toThrow();
      stdout.restore();
    });
  });
});
