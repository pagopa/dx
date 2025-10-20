import { readFileSync, existsSync } from "fs";
import { trace, context as otelContext } from "@opentelemetry/api";

async function post(): Promise<void> {
  try {
    const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
    const { logs } = require("@opentelemetry/api-logs");
    const { resourceFromAttributes } = require("@opentelemetry/resources");
    // const {
    //   SemanticResourceAttributes,
    // } = require("@opentelemetry/semantic-conventions");

    const startMs = parseInt(process.env.OTEL_SESSION_START || "0", 10);
    const durationMs = startMs ? Date.now() - startMs : 0;
    const eventsFile = process.env.OTEL_EVENT_FILE;
    console.log(`Post telemetry: duration=${durationMs}ms`);
    console.log(`Post telemetry: file=${eventsFile}`);

    // Cloud role name = workflow name; instance = run id
    const workflowName =
      process.env.GITHUB_WORKFLOW || process.env.GITHUB_ACTION;
    const runId = process.env.GITHUB_RUN_ID;
    const repo =
      process.env.GITHUB_ACTION_REPOSITORY || process.env.GITHUB_REPOSITORY;
    const actor = process.env.GITHUB_ACTOR;

    const resource = resourceFromAttributes({
      ["service.name"]: workflowName,
      ["service.instance.id"]: runId,
      ["service.namespace"]: "dx",
    });

    useAzureMonitor({
      resource,
      azureMonitorExporterOptions: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
      enableLiveMetrics: false,
    });

    const logger = logs
      .getLoggerProvider()
      .getLogger("workflow-logger", "1.0.0");
    const tracer = trace.getTracer("workflow-tracer");
    const correlationId = process.env.OTEL_CORRELATION_ID || ""; // retained for backward compatibility in attributes if needed

    // Single span to correlate events (operation id)
    const span = tracer.startSpan("workflow-run", {
      attributes: {
        "workflow.name": workflowName,
        "workflow.run_id": runId,
        "workflow.repository": repo,
        "workflow.author": actor,
      },
    });

    if (eventsFile && existsSync(eventsFile)) {
      const lines = readFileSync(eventsFile, "utf-8")
        .split(/\n/)
        .filter((l) => l.trim().length);
      otelContext.with(trace.setSpan(otelContext.active(), span), () => {
        const spanTraceId = span.spanContext().traceId;
        for (const line of lines) {
          try {
            const ev = JSON.parse(line) as {
              name?: string;
              body?: string;
              attributes?: Record<string, string>;
              exception?: boolean;
            };
            const commonAttributes = {
              trace_id: spanTraceId,
              operation_id: spanTraceId,
              ...ev.attributes,
            } as Record<string, string>;
            if (ev.exception) {
              // Emit as exception via logs (Azure Monitor maps exception severity)
              logger.emit({
                body: ev.body || ev.name,
                severityNumber: 17, // Error
                attributes: {
                  "microsoft.custom_event.name": ev.name || "Exception",
                  "exception.type": ev.name || "Exception",
                  ...commonAttributes,
                },
              });
            } else {
              logger.emit({
                body: ev.body || ev.name,
                attributes: {
                  "microsoft.custom_event.name": ev.name || "CustomEvent",
                  ...commonAttributes,
                },
              });
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`Failed to parse event line: ${msg}`);
          }
        }
        // Final duration event (last event) without duplicating duration on every event
        logger.emit({
          body: `Workflow completed in ${durationMs}ms`,
          attributes: {
            "microsoft.custom_event.name": "WorkflowCompleted",
            trace_id: spanTraceId,
            operation_id: spanTraceId,
            "workflow.duration_ms": durationMs.toString(),
            "workflow.name": workflowName,
            "workflow.run_id": runId,
            "workflow.repository": repo,
            "workflow.author": actor,
            "Service Type": "GitHub Workflow",
          },
        });
      });
    } else {
      console.log("No events file found or empty");
    }

    span.end();

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
