/**
 * CommandPresenter — domain port for all CLI output.
 *
 * Use-cases depend on this interface, not on any concrete output mechanism.
 * Concrete implementations are injected at the entry point.
 *
 * The interface deliberately does NOT handle process exit: callers report the
 * error through `reportError`, then let the host terminate the process with
 * the appropriate exit code.
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface CommandPresenter {
  /**
   * Formats and emits the error.
   * Does NOT exit the process — that responsibility belongs to the host
   * after this returns.
   */
  reportError(error: unknown): void;

  /**
   * Emits the final successful result.
   */
  reportResult<T>(data: T): void;

  /**
   * Tracks `task` while emitting start/end lifecycle events for the named step.
   */
  trackStep<T>(name: string, task: () => Promise<T>): Promise<T>;
}
