import {
  context as otelContext,
  Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { Logger, logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
import { promises as fs } from "fs";
import { z } from "zod";

// Debug logging helper
const DEBUG = process.env.ACTIONS_RUNNER_DEBUG === "true";

// Zod schemas for telemetry lines
const eventLineSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  endSpan: z.undefined().optional(),
  exception: z.boolean().optional(),
  name: z.string(),
  span: z.undefined().optional(),
  startSpan: z.undefined().optional(),
});

const spanEndLineSchema = z.object({
  endSpan: z.string(),
  span: z.string(),
  startSpan: z.undefined().optional(),
});

const spanStartLineSchema = z.object({
  endSpan: z.undefined().optional(),
  span: z.string(),
  startSpan: z.string(),
});

const telemetryLineSchema = z.union([
  eventLineSchema,
  spanEndLineSchema,
  spanStartLineSchema,
]);

const postEnvSchema = z.object({
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
  // Optional environment variables
  CSP_LIST: z.string().default(""),
  GITHUB_ACTION_PATH: z.string().default(""),
  GITHUB_ACTOR: z.string().default(""),
  GITHUB_EVENT_NAME: z.string().default(""),
  GITHUB_REPOSITORY: z.string().default(""),
  GITHUB_RUN_ATTEMPT: z.string().default(""),
  GITHUB_RUN_ID: z.string().default(""),
  GITHUB_SERVER_URL: z.string().default(""),
  GITHUB_WORKFLOW: z.string().default("github-workflow"),
  GITHUB_WORKFLOW_REF: z.string().default(""),
  NODE_PACKAGE_MANAGER: z.string().default(""),
  OTEL_EVENT_FILE: z.string().optional(),
  OTEL_SESSION_START: z.string().default("0"),
  PIPELINE_RESULT: z.string().default("success"),
  TERRAFORM_VERSION: z.string().default(""),
});

// Telemetry line types inferred from schemas
type EventLine = z.infer<typeof eventLineSchema>;
type SpanEndLine = z.infer<typeof spanEndLineSchema>;
interface SpanMarker {
  end?: Date;
  start?: Date;
}
type SpanStartLine = z.infer<typeof spanStartLineSchema>;

type TelemetryLine = z.infer<typeof telemetryLineSchema>;

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
          `[setup-telemetry] Skipping span "${name}" due to end time (${m.end.toISOString()}) before start time (${m.start.toISOString()})`,
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

  if (ev.exception === true) {
    console.debug(`Processing exception event: ${ev.name}`);
    const exceptionName = ev.name || "Exception";
    errorTypes.add(exceptionName);
    span.recordException({
      message: ev.body || ev.name,
      name: exceptionName,
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: ev.body || ev.name });
    span.setAttribute("cicd.pipeline.result", "error");
  } else {
    console.debug(`Processing custom event: ${ev.name}, body: ${ev.body}`);
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
    spanEndLineSchema.safeParse(l).success ||
    spanStartLineSchema.safeParse(l).success
  );
}

function parseTelemetryLine(raw: string): null | TelemetryLine {
  try {
    const obj = JSON.parse(raw);
    const result = telemetryLineSchema.safeParse(obj);
    if (result.success) {
      console.debug(`Parsed telemetry line:`, result.data);
      return result.data;
    }
    console.debug(`Skipped non-conforming line: ${raw}`, result.error);
    return null;
  } catch (err) {
    console.warn("Skipping malformed telemetry line: " + raw);
    console.debug(`Parse error:`, err);
    return null;
  }
}

async function post(): Promise<void> {
  const envResult = postEnvSchema.safeParse(process.env);
  if (!envResult.success) {
    console.error(
      "Environment validation failed:",
      envResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    );
    throw new Error("Required environment variables are missing or invalid");
  }

  const env = envResult.data;
  const startMs = parseInt(env.OTEL_SESSION_START, 10);
  const eventsFile = env.OTEL_EVENT_FILE;
  console.log(`Post telemetry: file=${eventsFile}`);

  const workflowName = env.GITHUB_WORKFLOW;
  const workflowRef = env.GITHUB_WORKFLOW_REF;
  const runId = env.GITHUB_RUN_ID;
  const trigger = env.GITHUB_EVENT_NAME;
  const attempt = env.GITHUB_RUN_ATTEMPT;
  const repo = env.GITHUB_REPOSITORY;
  const actor = env.GITHUB_ACTOR;
  const workflowURL = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const actionPath = env.GITHUB_ACTION_PATH;
  const nodePackageManager = env.NODE_PACKAGE_MANAGER;
  const tfVersion = env.TERRAFORM_VERSION;
  const CSPs = env.CSP_LIST;
  const pipelineResult = env.PIPELINE_RESULT; // cancellation, error, failure, skip, success, timeout

  const resource = resourceFromAttributes({
    "enduser.id": actor,
    "service.instance.id": runId,
    "service.name": workflowRef,
    "service.namespace": "dx",
  });

  initAzureMonitor([], {
    azureMonitorExporterOptions: {
      connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
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
  console.debug(`Read ${lines.length} lines from events file`);
  const errorTypes = new Set<string>();
  if (lines.length) {
    console.debug(`Processing ${lines.length} telemetry lines`);
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
  } else {
    console.log("No events file found or empty");
  }

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
  let spanMarkerCount = 0;
  let eventCount = 0;
  let skippedCount = 0;

  otelContext.with(trace.setSpan(otelContext.active(), span), () => {
    for (const raw of lines) {
      const parsed = parseTelemetryLine(raw);
      if (!parsed) {
        skippedCount++;
        console.debug(
          `Skipped unparseable line (total skipped: ${skippedCount})`,
        );
        continue;
      }

      if (isSpanMarkerLine(parsed)) {
        spanMarkerCount++;
        console.debug(
          `Processing span marker #${spanMarkerCount}: ${parsed.span}`,
        );
        handleSpanMarker(parsed, markers);
        continue;
      }

      // Type narrowing: if it's not a span marker, it must be an EventLine
      eventCount++;
      console.debug(`Processing event #${eventCount}: ${parsed.name}`);
      emitEvent(parsed, span, actor, repo, runId, logger, errorTypes);
    }
    console.debug(
      `Processing complete: ${eventCount} events, ${spanMarkerCount} span markers, ${skippedCount} skipped`,
    );
    buildChildSpans(markers, tracer, span);
  });
}

async function readEventsFile(path?: string): Promise<string[]> {
  if (!path) {
    console.debug("No events file path provided");
    return [];
  }
  try {
    console.debug(`Reading events file: ${path}`);
    const content = await fs.readFile(path, "utf-8");
    if (DEBUG) {
      console.debug(`File content (${content.length} bytes):\n${content}`);
    }
    const lines = content
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    console.debug(`Extracted ${lines.length} non-empty lines`);
    return lines;
  } catch (err) {
    console.debug(`Failed to read events file: ${path}`, err);
    return [];
  }
}

post();
