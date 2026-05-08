/**
 * Shared LogTape configuration for the nx-terraform-plugin package.
 *
 * The plugin is consumed by Nx rather than started through a single entrypoint,
 * so logging is configured lazily the first time a module needs to emit a log.
 */

import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
  getLogger,
  type Logger,
} from "@logtape/logtape";

let loggingConfigurationPromise: Promise<void> | undefined;

export const configurePackageLogger = async (): Promise<void> => {
  if (loggingConfigurationPromise) {
    await loggingConfigurationPromise;
    return;
  }

  loggingConfigurationPromise = configure({
    loggers: [
      {
        category: ["nx-terraform-plugin"],
        lowestLevel: "info",
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
        formatter: getJsonLinesFormatter(),
      }),
    },
  });

  await loggingConfigurationPromise;
};

export const getPackageLogger = (category: string[]): Logger =>
  getLogger(["nx-terraform-plugin", ...category]);
