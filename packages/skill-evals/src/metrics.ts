/**
 * The metrics algebra: one definition of what Copilot sessions consumed.
 *
 * Producers (copilot-run telemetry) build values; the runner folds them into
 * suite totals and renders them for logs and reports. Adding a field touches
 * this module only.
 */
import { formatCredits, formatDuration, formatTokens } from "./format.js";

export type RunMetrics = Readonly<{
  aiCredits: number;
  durationMs: number;
  inputTokens: number;
  models: readonly string[];
  outputTokens: number;
}>;

export const emptyMetrics = (): RunMetrics => ({
  aiCredits: 0,
  durationMs: 0,
  inputTokens: 0,
  models: [],
  outputTokens: 0,
});

export const addMetrics = (
  left: RunMetrics,
  right: RunMetrics,
): RunMetrics => ({
  aiCredits: left.aiCredits + right.aiCredits,
  durationMs: left.durationMs + right.durationMs,
  inputTokens: left.inputTokens + right.inputTokens,
  models: [...new Set([...left.models, ...right.models])],
  outputTokens: left.outputTokens + right.outputTokens,
});

/** Folds a run list into one total; models keep their union. */
export const totalMetrics = (runs: readonly RunMetrics[]): RunMetrics =>
  runs.reduce(addMetrics, emptyMetrics());

/** One-line usage summary for progress logs. */
export const formatUsage = (usage: RunMetrics): string => {
  const models = usage.models.length > 0 ? ` · ${usage.models.join(", ")}` : "";
  return `${formatCredits(usage.aiCredits)} credits · ${formatDuration(
    usage.durationMs,
  )} model · ${formatTokens(usage.inputTokens, usage.outputTokens)}${models}`;
};
