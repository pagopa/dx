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
 * Configured logger instance that adapts to the runtime environment.
 *
 * Configuration:
 * - Log level: Controlled by LOG_LEVEL env var, defaults to "info"
 * - Lambda mode: Structured JSON output for CloudWatch integration
 * - Development mode: Pretty-printed output with colors and formatting
 *
 * Usage: logger.info("message"), logger.error(error, "context")
 */
export const logger = pino(
  {
    // Allow runtime log level control via environment variable
    level: process.env.LOG_LEVEL || "info",
    // Conditional configuration based on environment
    ...(isLambda
      ? {} // Lambda: Use default structured JSON format
      : {
          // Development: Use pretty printing for better readability
          transport: {
            target: "pino-pretty",
          },
        }),
  },
  // Lambda destination optimizes output for CloudWatch log parsing
  isLambda ? pinoLambdaDestination() : undefined,
);
