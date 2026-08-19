/**
 * LogTape setup for the skill-evals CLI.
 *
 * The entrypoint chooses the level from --verbose. Domain modules then call
 * getPackageLogger so they never read flags or process.env themselves.
 */
import {
  configure,
  getConsoleSink,
  getLogger,
  getTextFormatter,
  type Logger,
} from "@logtape/logtape";

export const getPackageLogger = (category: readonly string[] = []): Logger =>
  getLogger(["skill-evals", ...category]);

/** Compact console lines so Nx TUI stays readable during a long eval. */
export const configureLogging = async (verbose: boolean): Promise<void> =>
  configure({
    loggers: [
      {
        category: ["skill-evals"],
        lowestLevel: verbose ? "debug" : "info",
        sinks: ["console"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
    sinks: {
      console: getConsoleSink({
        formatter: getTextFormatter({
          category: (category) => category.slice(1).join("·") || "eval",
          format: ({ category, level, message, timestamp }) =>
            `${timestamp} [${level}] ${category}: ${message}`,
          level: "ABBR",
          timestamp: "time",
        }),
      }),
    },
  });
