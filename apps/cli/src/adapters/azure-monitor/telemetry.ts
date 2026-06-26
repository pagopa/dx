/**
 * Telemetry helpers for the dx CLI.
 *
 * All functions are no-ops when the OTel SDK has not been initialised (i.e.,
 * when telemetry is disabled or the connection string is absent).
 */

/**
 * Flush pending telemetry before the process exits.
 *
 * Uses shutdownAzureMonitor() which force-flushes AND shuts down every
 * provider (traces, logs, metrics). Flushing only the logger provider is not
 * enough: the root span ends right before the process exits, so without a
 * trace flush it would never be exported and would not appear in the
 * Application Insights timeline.
 *
 * Safe to call unconditionally — swallows all errors and is a no-op when the
 * SDK was never initialised (telemetry disabled or no connection string).
 */
export const flushTelemetry = async (): Promise<void> => {
  try {
    const { shutdownAzureMonitor } =
      await import("@azure/monitor-opentelemetry");
    await shutdownAzureMonitor();
  } catch {
    // Telemetry must never break the CLI.
  }
};
