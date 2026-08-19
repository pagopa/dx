/**
 * Domain-facing progress reporter for a skill-eval run.
 *
 * The CLI builds a LogTape-backed reporter. Domain modules take this port so
 * they stay free of logging configuration and can be tested with a collector.
 */
import { formatCredits, formatDuration, formatTokens } from "./format.js";
import { type Verbosity } from "./verbosity.js";

export type Progress = ProgressSink &
  Readonly<{
    forEval: (evalName: string, skillRef?: string) => Progress;
    verbose: boolean;
    verbosity: Verbosity;
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
  forEval: () => silentProgress,
  info: () => undefined,
  verbose: false,
  verbosity: 0,
};

export const createProgress = (
  logger: ProgressSink,
  verbosity: Verbosity,
  evalName?: string,
  skillRef?: string,
): Progress => {
  const propertiesFor = (
    properties: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    const withEval =
      evalName === undefined ? properties : { ...properties, eval: evalName };
    return skillRef === undefined ? withEval : { ...withEval, skillRef };
  };

  return {
    // Call through the logger object so LogTape methods keep `this`.
    debug: (message, properties) =>
      logger.debug(message, propertiesFor(properties)),
    forEval: (name, ref) => createProgress(logger, verbosity, name, ref),
    info: (message, properties) =>
      logger.info(message, propertiesFor(properties)),
    verbose: verbosity >= 1,
    verbosity,
  };
};

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
