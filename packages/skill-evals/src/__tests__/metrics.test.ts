/**
 * Verifies the metrics algebra: empty, add, fold, and usage formatting.
 */
import { describe, expect, it } from "vitest";

import {
  addMetrics,
  emptyMetrics,
  formatUsage,
  type RunMetrics,
  totalMetrics,
} from "../metrics.js";

const run = (overrides: Partial<RunMetrics> = {}): RunMetrics => ({
  ...emptyMetrics(),
  ...overrides,
});

describe("emptyMetrics", () => {
  it("is the additive identity", () => {
    const value = run({ aiCredits: 2, models: ["gpt-5.6-sol"] });

    expect(addMetrics(emptyMetrics(), value)).toEqual(value);
    expect(addMetrics(value, emptyMetrics())).toEqual(value);
  });
});

describe("addMetrics", () => {
  it("sums numeric fields and unions models", () => {
    const total = addMetrics(
      run({
        aiCredits: 1,
        durationMs: 100,
        inputTokens: 10,
        models: ["a", "b"],
        outputTokens: 5,
      }),
      run({
        aiCredits: 2,
        durationMs: 50,
        inputTokens: 4,
        models: ["b", "c"],
        outputTokens: 3,
      }),
    );

    expect(total).toEqual({
      aiCredits: 3,
      durationMs: 150,
      inputTokens: 14,
      models: ["a", "b", "c"],
      outputTokens: 8,
    });
  });
});

describe("totalMetrics", () => {
  it("folds an empty list to empty metrics", () => {
    expect(totalMetrics([])).toEqual(emptyMetrics());
  });

  it("folds many runs into one total", () => {
    const total = totalMetrics([
      run({ inputTokens: 10, outputTokens: 1 }),
      run({ aiCredits: 0.5, inputTokens: 5, outputTokens: 2 }),
      run({ durationMs: 1_000, models: ["gpt-5-mini"] }),
    ]);

    expect(total).toEqual({
      aiCredits: 0.5,
      durationMs: 1_000,
      inputTokens: 15,
      models: ["gpt-5-mini"],
      outputTokens: 3,
    });
  });
});

describe("formatUsage", () => {
  it("summarizes credits, model time, tokens, and models", () => {
    expect(
      formatUsage({
        aiCredits: 1.5,
        durationMs: 61_000,
        inputTokens: 10,
        models: ["gpt-5.6-sol"],
        outputTokens: 4,
      }),
    ).toBe("1.50 credits · 1m 1s model · 10 in / 4 out · gpt-5.6-sol");
  });

  it("omits the model list when empty", () => {
    expect(formatUsage(run({ inputTokens: 3 }))).toBe(
      "0 credits · 0s model · 3 in / 0 out",
    );
  });
});
