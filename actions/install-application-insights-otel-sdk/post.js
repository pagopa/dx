const core = require("@actions/core");

async function post() {
  try {
    // if (core.getState("otel_init") !== "true") {
    //   core.warning("OTel not initialized earlier, skipping flush.");
    //   return;
    // }

    // core.info("Flushing OpenTelemetry providers...");

    const { metrics, trace } = require("@opentelemetry/api");
    const { logs } = require("@opentelemetry/api-logs");

    await Promise.all([
      logs.getLoggerProvider().forceFlush?.(),
      metrics.getMeterProvider?.().forceFlush?.(),
      trace.getTracerProvider?.().forceFlush?.(),
    ]).catch((e) => core.warning(`Flush error: ${e.message}`));

    core.info("Flush complete.");
  } catch (err) {
    core.warning(`Post action failed: ${err.message}`);
  }
}

post();
