/**
 * Logger injection system for external logger management.
 * Parent modules must provide a logger instance before using the package.
 */

interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  error: (error: unknown, msg?: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
}

/**
 * Current logger instance - must be set by parent modules.
 */
let currentLogger: Logger | null = null;

/**
 * Sets a logger instance for the package.
 * Must be called before using any package functionality.
 *
 * @param customLogger - Logger instance to use
 */
export const setLogger = (customLogger: Logger) => {
  currentLogger = customLogger;
};

/**
 * Gets the current logger instance.
 * Throws error if no logger has been set.
 */
export const logger: Logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (!currentLogger)
      throw new Error("Logger not initialized. Call setLogger() first.");
    currentLogger.debug(msg, ...args);
  },
  error: (error: unknown, msg?: string, ...args: unknown[]) => {
    if (!currentLogger)
      throw new Error("Logger not initialized. Call setLogger() first.");
    currentLogger.error(error, msg, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (!currentLogger)
      throw new Error("Logger not initialized. Call setLogger() first.");
    currentLogger.info(msg, ...args);
  },
};
