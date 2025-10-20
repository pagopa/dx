import { readFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { trace, context as otelContext } from "@opentelemetry/api";

async function post(): Promise<void> {
  const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
  const { logs } = require("@opentelemetry/api-logs");

  const startMs = parseInt(process.env.OTEL_SESSION_START || "0", 10);
  const durationMs = startMs ? Date.now() - startMs : 0;
  const eventsFile = process.env.OTEL_EVENT_FILE;
  console.log(`Post telemetry: duration=${durationMs}ms`);
  console.log(`Post telemetry: file=${eventsFile}`);

  const workflowName =
    process.env.GITHUB_WORKFLOW || process.env.GITHUB_ACTION || "";
  const runId = process.env.GITHUB_RUN_ID;
  const repo =
    process.env.GITHUB_ACTION_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const actor = process.env.GITHUB_ACTOR;
  const workflowURL = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    enableLiveMetrics: false,
  });

  const logger = logs.getLoggerProvider().getLogger("workflow-logger", "1.0.0");
  const correlationId = process.env.OTEL_CORRELATION_ID || "";
  const tracer = trace.getTracer("workflow-tracer");
  const span = tracer.startSpan(workflowName, {
    attributes: {
      "cicd.pipeline.action.name": workflowName,
      "cicd.pipeline.task.run.id": runId,
      "cicd.pipeline.task.run.url.full": workflowURL,
      "cicd.pipeline.repository": repo,
      "cicd.pipeline.author": actor,
      "cicd.pipeline.duration_ms": durationMs.toString(),
      "cicd.pipeline.result": "success", // TODO: update the value to: cancellation, error, failure, skip, success, timeout
      "error.type": "",
    },
  });
  const operationTraceId =
    span.spanContext().traceId ||
    correlationId ||
    randomUUID().replace(/-/g, "").slice(0, 32);

  if (eventsFile && existsSync(eventsFile)) {
    const lines = readFileSync(eventsFile, "utf-8")
      .split(/\n/)
      .filter((l) => l.trim().length);

    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      for (const line of lines) {
        const ev = JSON.parse(line) as {
          name?: string;
          body?: string;
          attributes?: Record<string, string>;
          exception?: boolean;
        };

        const commonAttributes = {
          trace_id: operationTraceId,
          operation_id: operationTraceId,
          ...ev.attributes,
        } as Record<string, string>;

        if (ev.exception) {
          // logger.emit({
          //   body: ev.body || ev.name,
          //   severityNumber: 17, // Error
          //   attributes: {
          //     "microsoft.custom_event.name": ev.name || "Exception",
          //     "exception.type": ev.name || "Exception",
          //     ...commonAttributes,
          //   },
          // });
        } else {
          // logger.emit({
          //   body: ev.body || ev.name,
          //   attributes: {
          //     "microsoft.custom_event.name": ev.name || "CustomEvent",
          //     ...commonAttributes,
          //   },
          // });
        }
      }

      // logger.emit({
      //   body: `Workflow completed in ${durationMs}ms`,
      //   attributes: {
      //     "microsoft.custom_event.name": "WorkflowCompleted",
      //     // trace_id: operationTraceId,
      //     // operation_id: operationTraceId,
      //     "workflow.duration_ms": durationMs.toString(),
      //     "workflow.name": workflowName,
      //     "workflow.run_id": runId,
      //     "workflow.repository": repo,
      //     "workflow.author": actor,
      //     "Service Type": "GitHub Workflow",
      //   },
      // });
    });
  } else {
    console.log("No events file found or empty");
  }

  span.end();
  // Flush logs provider (SDK may not always expose forceFlush)
  await logs.getLoggerProvider().forceFlush?.();
  await new Promise((r) => setTimeout(r, 2000));
  console.log("Telemetry flushed");
}

post();
