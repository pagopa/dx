/**
 * Environment-aware logger configuration using Pino.
 *
 * This logger automatically adapts its output format based on the runtime environment:
 * - In AWS Lambda: Uses structured JSON logging optimized for CloudWatch
 * - In development: Uses pretty-printed, human-readable format
 *
 * The dual configuration ensures optimal performance in production while
 * maintaining developer experience during local development.
 */

import pino from "pino";
import { pinoLambdaDestination } from "pino-lambda";

// Detect if we're running in AWS Lambda by checking for the function name environment variable
// This is a reliable indicator that AWS sets automatically
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Default logger instance that adapts to the runtime environment.
 * Used as fallback when no external logger is provided.
 */
const defaultLogger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    ...(isLambda
      ? {}
      : {
          transport: {
            target: "pino-pretty",
          },
        }),
  },
  isLambda ? pinoLambdaDestination() : undefined,
);

/**
 * Current logger instance - can be overridden by parent modules.
 */
let currentLogger = defaultLogger;

/**
 * Silent logger that discards all log messages.
 * Useful for environments where logging should be completely disabled.
 */
export const silentLogger = {
  debug: () => void 0,
  error: () => void 0,
  fatal: () => void 0,
  info: () => void 0,
  trace: () => void 0,
  warn: () => void 0,
} as typeof defaultLogger;

/**
 * Sets a custom logger instance for the package.
 * Allows parent modules to inject their own logger configuration.
 *
 * @param customLogger - Logger instance to use (must have info, debug, error methods)
 */
export const setLogger = (customLogger: typeof defaultLogger) => {
  currentLogger = customLogger;
};

/**
 * Gets the current logger instance.
 * Returns either the injected logger or the default one.
 */
export const logger = new Proxy(defaultLogger, {
  get(target, prop) {
    return currentLogger[prop as keyof typeof currentLogger];
  },
});
