/**
 * Tests for JsonCommandPresenter.
 *
 * JsonCommandPresenter emits all output as NDJSON to stdout so agents can
 * consume a single stream. Tests verify the wire format and that values
 * flow through correctly.
 */
import { describe, expect, it, vi } from "vitest";

import { JsonCommandPresenter } from "../json-command-presenter.js";

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

describe("JsonCommandPresenter", () => {
  describe("trackStep", () => {
    it("executes the task and returns its resolved value", async () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
      const result = await logger.trackStep("check terraform", () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
      stdout.restore();
    });

    it("emits start then success events to stdout", async () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
      await logger.trackStep("check terraform", () => Promise.resolve("done"));
      expect(stdout.written).toHaveLength(2);
      expect(JSON.parse(stdout.written[0])).toMatchObject({
        name: "check terraform",
        status: "start",
        type: "step",
      });
      expect(JSON.parse(stdout.written[1])).toMatchObject({
        name: "check terraform",
        status: "success",
        type: "step",
      });
      stdout.restore();
    });

    it("emits error event to stdout and rethrows on task failure", async () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
      const error = new Error("terraform not found");
      await expect(
        logger.trackStep("check terraform", () => Promise.reject(error)),
      ).rejects.toThrow("terraform not found");
      expect(JSON.parse(stdout.written[1])).toMatchObject({
        error: "terraform not found",
        name: "check terraform",
        status: "error",
        type: "step",
      });
      stdout.restore();
    });

    it("can run multiple sequential steps", async () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
      const order: string[] = [];
      await logger.trackStep("step A", async () => {
        order.push("A");
      });
      await logger.trackStep("step B", async () => {
        order.push("B");
      });
      expect(order).toEqual(["A", "B"]);
      stdout.restore();
    });
  });

  describe("reportResult", () => {
    it("emits an ok:true JSON envelope to stdout", () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
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
      const logger = new JsonCommandPresenter();
      logger.reportError(new Error("something failed"));
      expect(JSON.parse(stdout.written[0])).toMatchObject({
        error: "something failed",
        ok: false,
      });
      stdout.restore();
    });

    it("handles non-Error values without throwing", () => {
      const stdout = captureStdout();
      const logger = new JsonCommandPresenter();
      expect(() => logger.reportError("plain string error")).not.toThrow();
      stdout.restore();
    });
  });
});
