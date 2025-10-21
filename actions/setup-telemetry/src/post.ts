import { readFileSync, existsSync } from "fs";
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
  const nodePackageManager = process.env.NODE_PACKAGE_MANAGER || "";
  const tfVersion = process.env.TERRAFORM_VERSION || "";
  const CSPs = process.env.CSP_LIST || "";
  const pipelineResult = process.env.PIPELINE_RESULT || "success"; // cancellation, error, failure, skip, success, timeout

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
      "cicd.pipeline.result": pipelineResult,
      "cdcd.pipeline.path": actionPath,
      "error.type": "",
      ...(nodePackageManager
        ? { "node.package_manager": nodePackageManager }
        : {}),
      ...(tfVersion ? { "terraform.version": tfVersion } : {}),
      ...(CSPs ? { "cloud_provider.enabled": CSPs } : {}),
    },
  });

  if (eventsFile && existsSync(eventsFile)) {
    const lines = readFileSync(eventsFile, "utf-8")
      .split(/\n/)
      .filter((l) => l.trim().length);

    interface SpanMarker {
      start?: Date;
      end?: Date;
    }
    const spanMarkers: Record<string, SpanMarker[]> = {};

    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      for (const line of lines) {
        // Span marker shape examples:
        // {"span":"build","startSpan":"2025-01-01T10:00:00.000Z"}
        // {"span":"build","endSpan":"2025-01-01T10:05:00.000Z"}
        let parsed: any = null;

        try {
          parsed = JSON.parse(line);
        } catch {
          console.warn("Skipping malformed telemetry line: " + line);
          continue;
        }
        if (!parsed) continue;

        // Span marker branch
        if (parsed.span && (parsed.startSpan || parsed.endSpan)) {
          const arr = (spanMarkers[parsed.span] =
            spanMarkers[parsed.span] || []);
          // Choose the current open marker or create new
          let current = arr[arr.length - 1];
          if (!current || (current.start && current.end)) {
            current = {};
            arr.push(current);
          }
          if (parsed.startSpan) {
            current.start = new Date(parsed.startSpan);
          }
          if (parsed.endSpan) {
            // If end arrives before start (out-of-order), start a new marker with only end to avoid corrupting previous
            if (!current || !current.start) {
              current = { end: new Date(parsed.endSpan) };
              arr.push(current);
            } else {
              current.end = new Date(parsed.endSpan);
            }
          }
          continue;
        }

        // Regular event branch
        const ev: {
          name: string;
          body: string;
          exception: boolean;
          attributes?: Record<string, string>;
        } = parsed;

        const attrs = {
          "ci.pipeline.repo": repo,
          "ci.pipeline.run.id": runId,
          "enduser.id": actor,
          ...ev.attributes,
        };

        if (ev.exception) {
          span.recordException({
            name: ev.name || "Exception",
            message: ev.body || ev.name,
          });
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: ev.body || ev.name,
          });
          span.setAttribute("cicd.pipeline.result", "error");
        } else {
          logger.emit({
            body: ev.body || ev.name,
            attributes: {
              "microsoft.custom_event.name": ev.name || "CustomEvent",
              ...attrs,
            },
          });
        }
      }

      // After processing events, create child spans for completed markers
      for (const [spanName, occurrences] of Object.entries(spanMarkers)) {
        for (const marker of occurrences) {
          if (!marker.start || !marker.end) continue; // incomplete pair
          if (marker.end < marker.start) continue; // invalid ordering
          const child = tracer.startSpan(
            spanName,
            {
              kind: SpanKind.INTERNAL,
              startTime: marker.start,
            },
            trace.setSpan(otelContext.active(), span),
          );
          child.end(marker.end);
        }
      }
    });
  } else {
    console.log("No events file found or empty");
  }

  span.end();

  await logs.getLoggerProvider().forceFlush?.();
  await new Promise((r) => setTimeout(r, 2000));
  console.log("Telemetry flushed");
}

post();
