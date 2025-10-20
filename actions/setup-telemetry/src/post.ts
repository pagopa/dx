/**
 * Post-step telemetry flush.
 * Replays queued events written to the NDJSON file during the session and flushes them
 * via Azure Monitor's OpenTelemetry distribution.
 */
import { readFileSync, existsSync } from "fs";

async function post(): Promise<void> {
  try {
    // Dynamic requires keep build simple; if bundling later they'll be resolved statically.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logs } = require("@opentelemetry/api-logs");

    const startMs = parseInt(process.env.OTEL_SESSION_START || "0", 10);
    const durationMs = startMs ? Date.now() - startMs : 0;
    const eventsFile = process.env.OTEL_EVENT_FILE;
    console.log(`Post telemetry: duration=${durationMs}ms file=${eventsFile}`);

    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
      enableLiveMetrics: false,
    });

    const logger = logs
      .getLoggerProvider()
      .getLogger("workflow-logger", "1.0.0");
    const correlationId = process.env.OTEL_CORRELATION_ID || "";

    if (eventsFile && existsSync(eventsFile)) {
      const lines = readFileSync(eventsFile, "utf-8")
        .split(/\n/)
        .filter((l) => l.trim().length);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line) as {
            name?: string;
            body?: string;
            attributes?: Record<string, string>;
          };
          logger.emit({
            body: ev.body || ev.name,
            attributes: {
              "microsoft.custom_event.name": ev.name || "CustomEvent",
              "otel.workflow.duration_ms": durationMs.toString(),
              ...(correlationId && { "correlation.id": correlationId }),
              ...ev.attributes,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`Failed to parse event line: ${msg}`);
        }
      }
    } else {
      console.log("No events file found or empty");
    }

    // Flush logs provider (SDK may not always expose forceFlush)
    await logs.getLoggerProvider().forceFlush?.();
    await new Promise((r) => setTimeout(r, 500));
    console.log("Telemetry flushed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Post telemetry failed: ${msg}`);
  }
}

post();
