import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import {
  context as otelContext,
  Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { Logger, logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { promises as fs } from "fs";

// Telemetry line models
interface EventLine {
  attributes?: Record<string, string>;
  body?: string;
  endSpan?: undefined;
  exception?: boolean;
  name: string;
  span?: undefined;
  startSpan?: undefined;
}

interface SpanEndLine {
  endSpan: string;
  span: string;
  startSpan?: undefined;
}

interface SpanMarker {
  end?: Date;
  start?: Date;
}

interface SpanStartLine {
  endSpan?: undefined;
  span: string;
  startSpan: string;
}

type TelemetryLine = EventLine | SpanEndLine | SpanStartLine;

function buildChildSpans(
  markers: Record<string, SpanMarker[]>,
  tracer: ReturnType<typeof trace.getTracer>,
  root: Span,
) {
  for (const [name, occurrences] of Object.entries(markers)) {
    for (const m of occurrences) {
      if (!m.start || !m.end) continue;
      if (m.end < m.start) {
        console.warn(
          `[setup-telemetry] Skipping span "${name}" due to end time (${m.end.toISOString()}) before start time (${m.start.toISOString()})`
        );
        continue;
      }
      const child = tracer.startSpan(
        name,
        { kind: SpanKind.INTERNAL, startTime: m.start },
        trace.setSpan(otelContext.active(), root),
      );
      child.end(m.end);
    }
  }
}

function emitEvent(
  ev: EventLine,
  span: Span,
  actor: string,
  repo: string,
  runId: string,
  logger: Logger,
  errorTypes: Set<string>,
) {
  const attrs = {
    "ci.pipeline.repo": repo,
    "ci.pipeline.run.id": runId,
    "enduser.id": actor,
    ...ev.attributes,
  };

  if (ev.exception) {
    const exceptionName = ev.name || "Exception";
    errorTypes.add(exceptionName);
    span.recordException({
      message: ev.body || ev.name,
      name: exceptionName,
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: ev.body || ev.name });
    span.setAttribute("cicd.pipeline.result", "error");
  } else {
    logger.emit({
      attributes: {
        "microsoft.custom_event.name": ev.name || "CustomEvent",
        ...attrs,
      },
      body: ev.body || ev.name,
    });
  }
}

function handleSpanMarker(
  line: SpanEndLine | SpanStartLine,
  markers: Record<string, SpanMarker[]>,
) {
  const arr = (markers[line.span] = markers[line.span] || []);
  let current = arr[arr.length - 1];

  if (!current || (current.start && current.end)) {
    current = {};
    arr.push(current);
  }

  if ("startSpan" in line && line.startSpan)
    current.start = new Date(line.startSpan);

  if ("endSpan" in line && line.endSpan) {
    if (!current.start) {
      current = { end: new Date(line.endSpan) };
      arr.push(current);
    } else {
      current.end = new Date(line.endSpan);
    }
  }
}

function isSpanMarkerLine(l: TelemetryLine): l is SpanEndLine | SpanStartLine {
  return (
    typeof l === "object" &&
    l !== null &&
    "span" in l &&
    (Object.prototype.hasOwnProperty.call(l, "startSpan") ||
      Object.prototype.hasOwnProperty.call(l, "endSpan"))
  );
}

function parseTelemetryLine(raw: string): null | TelemetryLine {
  try {
    const obj = JSON.parse(raw);
    return (
      typeof obj === "object" && obj !== null ? obj : null
    ) as null | TelemetryLine;
  } catch {
    console.warn("Skipping malformed telemetry line: " + raw);
    return null;
  }
}

async function post(): Promise<void> {
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

  const resource = resourceFromAttributes({
    "enduser.id": actor,
    "service.instance.id": runId,
    "service.name": workflowRef,
    "service.namespace": "dx",
  });

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    enableLiveMetrics: false,
    resource,
  });

  const logger = logs.getLoggerProvider().getLogger("workflow-logger", "1.0.0");
  const tracer = trace.getTracer("workflow-tracer");
  const span = tracer.startSpan(workflowName, {
    attributes: {
      "cicd.pipeline.action.name": workflowName,
      "cicd.pipeline.attempt": attempt,
      "cicd.pipeline.author": actor,
      "cicd.pipeline.path": actionPath,
      "cicd.pipeline.repository": repo,
      "cicd.pipeline.result": pipelineResult,
      "cicd.pipeline.run.id": runId,
      "cicd.pipeline.run.url.full": workflowURL,
      "cicd.pipeline.trigger": trigger,
      "error.type": "",
      ...(nodePackageManager
        ? { "node.package_manager": nodePackageManager }
        : {}),
      ...(tfVersion ? { "terraform.version": tfVersion } : {}),
      ...(CSPs ? { "cloud_provider.enabled": CSPs } : {}),
    },
    kind: SpanKind.SERVER,
    startTime: new Date(startMs),
  });

  const lines = await readEventsFile(eventsFile);
  const errorTypes = new Set<string>();
  if (lines.length)
    processTelemetryLines(
      lines,
      span,
      tracer,
      actor,
      repo,
      runId,
      logger,
      errorTypes,
    );
  else console.log("No events file found or empty");

  // Update error.type with collected exception names if any occurred
  if (errorTypes.size > 0) {
    span.setAttribute("error.type", Array.from(errorTypes).join(", "));
  }

  span.end();

  // brief delay to allow async exporter flush
  const EXPORTER_FLUSH_DELAY_MS = 1500;
  await new Promise((r) => setTimeout(r, EXPORTER_FLUSH_DELAY_MS));
  console.log("Telemetry flushed");
}

function processTelemetryLines(
  lines: string[],
  span: Span,
  tracer: ReturnType<typeof trace.getTracer>,
  actor: string,
  repo: string,
  runId: string,
  logger: Logger,
  errorTypes: Set<string>,
) {
  const markers: Record<string, SpanMarker[]> = {};
  otelContext.with(trace.setSpan(otelContext.active(), span), () => {
    for (const raw of lines) {
      const parsed = parseTelemetryLine(raw);
      if (!parsed) continue;

      if (isSpanMarkerLine(parsed)) {
        handleSpanMarker(parsed, markers);
        continue;
      }
      emitEvent(
        parsed as EventLine,
        span,
        actor,
        repo,
        runId,
        logger,
        errorTypes,
      );
    }
    buildChildSpans(markers, tracer, span);
  });
}

async function readEventsFile(path?: string): Promise<string[]> {
  if (!path) return [];
  try {
    const content = await fs.readFile(path, "utf-8");
    return content
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

post();
