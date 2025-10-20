import { readFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import {
  trace,
  context as otelContext,
  SpanKind,
  SpanStatusCode,
} from "@opentelemetry/api";

async function post(): Promise<void> {
  const { useAzureMonitor } = require("@azure/monitor-opentelemetry");
  const { logs } = require("@opentelemetry/api-logs");

  const startMs = parseInt(process.env.OTEL_SESSION_START || "0", 10);
  const eventsFile = process.env.OTEL_EVENT_FILE;
  console.log(`Post telemetry: file=${eventsFile}`);

  const workflowName = process.env.GITHUB_WORKFLOW || "github-workflow";
  const workflowRef = process.env.GITHUB_WORKFLOW_REF || "";
  const runId = process.env.GITHUB_RUN_ID || "";
  const trigger = process.env.GITHUB_EVENT_NAME || "";
  const attempt = process.env.GITHUB_RUN_ATTEMPT || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const actor = process.env.GITHUB_ACTOR || "";
  const workflowURL = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const actionPath = process.env.GITHUB_ACTION_PATH || "";

  const { resourceFromAttributes } = require("@opentelemetry/resources");
  const resource = resourceFromAttributes({
    "service.name": workflowRef,
    "service.instance.id": runId,
    "service.namespace": "dx",
    "enduser.id": actor,
  });

  useAzureMonitor({
    resource,
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    enableLiveMetrics: false,
  });

  const logger = logs.getLoggerProvider().getLogger("workflow-logger", "1.0.0");
  const correlationId = process.env.OTEL_CORRELATION_ID || "";
  const tracer = trace.getTracer("workflow-tracer");
  const span = tracer.startSpan(workflowName, {
    kind: SpanKind.SERVER,
    startTime: new Date(startMs),
    attributes: {
      "cicd.pipeline.action.name": workflowName,
      "cicd.pipeline.run.id": runId,
      "cicd.pipeline.attempt": attempt,
      "cicd.pipeline.trigger": trigger,
      "cicd.pipeline.repository": repo,
      "cicd.pipeline.run.url.full": workflowURL,
      "cicd.pipeline.author": actor,
      "cicd.pipeline.result": "success", // TODO: update the value to: cancellation, error, failure, skip, success, timeout
      "cdcd.pipeline.path": actionPath,
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
        let ev: {
          name?: string;
          body?: string;
          attributes?: Record<string, string>;
          exception?: unknown;
        } = {};

        try {
          ev = JSON.parse(line);
        } catch (e) {
          console.warn("Skipping malformed telemetry line");
          continue;
        }
        // Robust exception detection: boolean, string, raw line, or attribute flag
        const isException =
          ev.exception === true ||
          ev.exception === "true" ||
          /"exception"\s*:\s*true/.test(line) ||
          ev.attributes?.exception === "true";
        console.log(
          `Parsed event name=${ev.name} exceptionRaw=${String(ev.exception)} detectedException=${isException}`,
        );

        const baseAttrs: Record<string, string> = {
          "Service Type": "GitHub Workflow",
          "ci.pipeline.repo": repo,
          "ci.pipeline.run.id": runId,
          "enduser.id": actor,
          ...ev.attributes,
        };

        if (isException) {
          // Record exception on span (OpenTelemetry semantic event -> Azure Monitor exception telemetry)
          span.recordException({
            name: ev.name || "Exception",
            message: (ev.body || ev.name || "Exception") as string,
          });
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (ev.body || ev.name || "Exception") as string,
          });
          // Emit also as log (kept for searchability)
          // logger.emit({
          //   body: ev.body || ev.name,
          //   severityNumber: 17,
          //   attributes: {
          //     "microsoft.custom_event.name": ev.name || "Exception",
          //     "exception.type": ev.name || "Exception",
          //     "exception.message": ev.body || ev.name || "Exception",
          //     ...baseAttrs,
          //   },
          // });
        } else {
          console.log("Emitting log");
          // logger.emit({
          //   body: ev.body || ev.name,
          //   attributes: {
          //     "microsoft.custom_event.name": ev.name || "CustomEvent",
          //     ...baseAttrs,
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
