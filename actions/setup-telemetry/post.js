const core = require("@actions/core");
const fs = require("fs");

async function post() {
  try {
    const startMs = parseInt(process.env.OTEL_SESSION_START || "0", 10);
    const durationMs = startMs ? Date.now() - startMs : 0;
    const eventsFile = process.env.OTEL_EVENT_FILE;
    core.info(`Post telemetry: duration=${durationMs}ms file=${eventsFile}`);

    const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
    const { logs } = require("@opentelemetry/api-logs");

    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
    });

    const logger = logs
      .getLoggerProvider()
      .getLogger("workflow-logger", "1.0.0");

    if (eventsFile && fs.existsSync(eventsFile)) {
      const lines = fs
        .readFileSync(eventsFile, "utf-8")
        .split(/\n/)
        .filter((l) => l.trim().length);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line);
          logger.emit({
            body: ev.body || ev.name,
            attributes: {
              "microsoft.custom_event.name": ev.name || "CustomEvent",
              "otel.workflow.duration_ms": durationMs.toString(),
              ...ev.attributes,
            },
          });
        } catch (e) {
          core.warning(`Failed to parse event line: ${e.message}`);
        }
      }
    } else {
      core.info("No events file found or empty");
    }

    // Flush
    await logs.getLoggerProvider().forceFlush?.();
    await new Promise((r) => setTimeout(r, 500));
    core.info("Telemetry flushed");
  } catch (err) {
    core.warning(`Post telemetry failed: ${err.message}`);
  }
}

post();
