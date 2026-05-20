/**
 * OutputLogger — domain port for all CLI output.
 *
 * Use-cases depend on this interface, not on any concrete output mechanism.
 * Adapters (TextOutputLogger, JsonOutputLogger) satisfy it at the commander
 * layer and are injected at the entry point.
 *
 * The interface deliberately does NOT handle process exit: callers report the
 * error through `reportError`, then let commander terminate the process with
 * the appropriate exit code.
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface OutputLogger {
  /**
   * Formats and emits the error.
   * Does NOT exit the process — that responsibility belongs to the commander
   * adapter which calls `command.error(…, { exitCode })` after this.
   */
  reportError(error: unknown): void;

  /**
   * Emits the final successful result.
   * In text mode this renders a human-readable summary; in JSON mode it emits
   * a structured `{"ok":true,...}` envelope on stdout.
   */
  reportResult<T>(data: T): void;

  /**
   * Runs `task` while emitting start/end lifecycle events for the named step.
   * In text mode this shows an ora spinner; in JSON mode it emits NDJSON
   * step events on stderr.
   */
  runStep<T>(name: string, task: () => Promise<T>): Promise<T>;
}
