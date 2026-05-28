/**
 * Category helpers for the nx-terraform-plugin LogTape logger tree.
 */

import {
  configure,
  getConsoleSink,
  getJsonLinesFormatter,
  getLogger,
  type Logger,
} from "@logtape/logtape";

export const getPackageLogger = (category: string[]): Logger =>
  getLogger(["nx-terraform-plugin", ...category]);

export const configureLogger = () =>
  configure({
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
