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

import { type ProgressSink } from "./progress.js";

export const getPackageLogger = (category: readonly string[] = []): Logger =>
  getLogger(["skill-evals", ...category]);

/**
 * LogTape interpolates `{key}` from properties. JSON tool args and Terraform
 * snippets contain literal braces, which otherwise render as `undefined`.
 * Known placeholders stay intact; everything else is escaped as `{{` / `}}`.
 */
export const escapeLogTapeLiterals = (
  message: string,
  properties: Readonly<Record<string, unknown>>,
): string => {
  if (!message.includes("{") && !message.includes("}")) {
    return message;
  }
  return message
    .replaceAll("{", "{{")
    .replaceAll("}", "}}")
    .replace(/\{\{([^{}]*)\}\}/g, (escaped, key: string) => {
      const trimmed = key.trim();
      if (trimmed === "*" || key in properties || trimmed in properties) {
        return `{${key}}`;
      }
      return escaped;
    });
};

/** Adapts a LogTape logger so conversation blocks keep literal braces. */
export const toProgressSink = (logger: ProgressSink): ProgressSink => ({
  debug: (message, properties = {}) =>
    logger.debug(escapeLogTapeLiterals(message, properties), properties),
  info: (message, properties = {}) =>
    logger.info(escapeLogTapeLiterals(message, properties), properties),
});

/**
 * Print strings as-is. LogTape's default inspect() turns multiline Q&A into
 * quoted JavaScript concatenations (`"foo\\n" + "bar"`), which is unreadable
 * in the Nx TUI.
 */
export const formatLogValue = (
  value: unknown,
  inspect: (value: unknown) => string,
): string => (typeof value === "string" ? value : inspect(value));

export type LogLineParts = Readonly<{
  category: string;
  level: string;
  message: string;
  properties?: Readonly<Record<string, unknown>>;
  timestamp: string;
}>;

/** Puts the active eval name next to [DBG] so parallel-looking lines stay scoped. */
export const formatLogLine = ({
  category,
  level,
  message,
  properties = {},
  timestamp,
}: LogLineParts): string => {
  const evalName = properties.eval;
  const scope =
    typeof evalName === "string" && evalName.length > 0 ? evalName : category;
  return `${timestamp} [${level}] ${scope}: ${message}`;
};

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
          format: ({ category, level, message, record, timestamp }) =>
            formatLogLine({
              category,
              level,
              message,
              properties: record.properties,
              timestamp: timestamp ?? "",
            }),
          level: "ABBR",
          timestamp: "time",
          value: formatLogValue,
        }),
      }),
    },
  });
