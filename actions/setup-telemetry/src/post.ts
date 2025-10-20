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
      "cicd.pipeline.result": "success", // TODO: update the value to: cancellation, error, failure, skip, success, timeout
      "cdcd.pipeline.path": actionPath,
      "error.type": "",
      ...(nodePackageManager
        ? { "node.package_manager": nodePackageManager }
        : {}),
      ...(tfVersion ? { "terraform.version": tfVersion } : {}),
      ...(CSPs ? { "cloud.provider_list": CSPs } : {}),
    },
  });

  if (eventsFile && existsSync(eventsFile)) {
    const lines = readFileSync(eventsFile, "utf-8")
      .split(/\n/)
      .filter((l) => l.trim().length);

    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      for (const line of lines) {
        let ev: {
          name: string;
          body: string;
          exception: boolean;
          attributes?: Record<string, string>;
        } | null = null;

        try {
          ev = JSON.parse(line);
        } catch {
          console.warn("Skipping malformed telemetry line: " + line);
          continue;
        }

        if (!ev) continue;

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
