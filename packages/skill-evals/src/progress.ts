/**
 * Domain-facing progress reporter for a skill-eval run.
 *
 * The CLI builds a LogTape-backed reporter. Domain modules take this port so
 * they stay free of logging configuration and can be tested with a collector.
 */
import { formatCredits, formatDuration, formatTokens } from "./format.js";

export type Progress = ProgressSink &
  Readonly<{
    verbose: boolean;
  }>;

export type ProgressSink = Readonly<{
  debug: (message: string, properties?: Record<string, unknown>) => void;
  info: (message: string, properties?: Record<string, unknown>) => void;
}>;

export type UsageSnapshot = Readonly<{
  aiCredits: number;
  durationMs: number;
  inputTokens: number;
  models?: readonly string[];
  outputTokens: number;
}>;

export const silentProgress: Progress = {
  debug: () => undefined,
  info: () => undefined,
  verbose: false,
};

export const createProgress = (
  logger: ProgressSink,
  verbose: boolean,
): Progress => ({
  debug: (message, properties = {}) => {
    logger.debug(message, properties);
  },
  info: (message, properties = {}) => {
    logger.info(message, properties);
  },
  verbose,
});

export const formatUsage = (usage: UsageSnapshot): string => {
  const models =
    usage.models && usage.models.length > 0
      ? ` · ${usage.models.join(", ")}`
      : "";
  return `${formatCredits(usage.aiCredits)} credits · ${formatDuration(
    usage.durationMs,
  )} model · ${formatTokens(usage.inputTokens, usage.outputTokens)}${models}`;
};

export const createElapsedTimer = (
  now: () => number = Date.now,
): (() => string) => {
  const startedAt = now();
  return () => formatDuration(now() - startedAt);
};
