/**
 * Setup Telemetry Action - Post-Execution Handler
 *
 * Processes and exports telemetry data collected during the workflow run.
 * Reads NDJSON event lines, reconstructs child spans from markers, emits custom
 * events and exceptions, then flushes all telemetry to Azure Application Insights.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import {
  context as otelContext,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
// import {
//   initAzureMonitor,
//   stopAzureMonitor,
// } from "@pagopa/azure-tracing/azure-monitor";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

interface WorkflowContext {
  actionPath: string;
  actor: string;
  eventName: string;
  repository: string;
  runAttempt: string;
  runId: string;
  serverUrl: string;
  workflow: string;
  workflowRef: string;
}

// Zod schemas for environment variables
const postEnvSchema = z.object({
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  CSP_LIST: z.string().default(""),
  GITHUB_ACTION_PATH: z.string().default(""),
  GITHUB_WORKFLOW_REF: z.string().default(""),
  NODE_PACKAGE_MANAGER: z.string().default(""),
  OTEL_EVENT_FILE: z.string().optional(),
  OTEL_SESSION_START: z.string().default("0"),
  PIPELINE_RESULT: z
    .enum(["cancellation", "error", "failure", "skip", "success", "timeout"])
    .default("success"),
  TERRAFORM_VERSION: z.string().default(""),
});

// Zod schemas for NDJSON telemetry lines using discriminated unions
const spanStartLineSchema = z.object({
  span: z.string(),
  startSpan: z.string(),
  type: z.literal("spanStart").optional().default("spanStart"),
});

const spanEndLineSchema = z.object({
  endSpan: z.string(),
  span: z.string(),
  type: z.literal("spanEnd").optional().default("spanEnd"),
});

const eventLineSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  body: z.string().optional().default(""),
  exception: z.boolean().default(false),
  name: z.string(),
  type: z.literal("event").optional().default("event"),
});

// Union of all telemetry line types
const telemetryLineSchema = z.discriminatedUnion("type", [
  spanStartLineSchema,
  spanEndLineSchema,
  eventLineSchema,
]);

type EventLine = z.infer<typeof eventLineSchema>;
type SpanEndLine = z.infer<typeof spanEndLineSchema>;
interface SpanMarker {
  end?: Date;
  start?: Date;
}

type SpanStartLine = z.infer<typeof spanStartLineSchema>;

type TelemetryLine = z.infer<typeof telemetryLineSchema>;

const githubContextSchema = z.object({
  actor: z.string().min(1),
  eventName: z.string().min(1),
  repository: z.string().min(1),
  runAttempt: z.number().int().positive(),
  runId: z.number().int().positive(),
  serverUrl: z.string().min(1),
  workflow: z.string().min(1),
});

function getWorkflowContext(
  env: z.infer<typeof postEnvSchema>,
): WorkflowContext {
  const githubContextResult = githubContextSchema.safeParse({
    actor: github.context.actor,
    eventName: github.context.eventName,
    repository: `${github.context.repo.owner}/${github.context.repo.repo}`,
    runAttempt: github.context.runAttempt,
    runId: github.context.runId,
    serverUrl: github.context.serverUrl,
    workflow: github.context.workflow,
  });

  if (!githubContextResult.success) {
    core.error(
      `Missing or invalid GitHub context:\n${z.prettifyError(githubContextResult.error)}`,
    );
    throw new Error("GitHub context validation failed");
  }

  const githubContext = githubContextResult.data;

  return {
    actionPath: env.GITHUB_ACTION_PATH,
    actor: githubContext.actor,
    eventName: githubContext.eventName,
    repository: githubContext.repository,
    runAttempt: String(githubContext.runAttempt),
    runId: String(githubContext.runId),
    serverUrl: githubContext.serverUrl,
    workflow: githubContext.workflow,
    workflowRef: env.GITHUB_WORKFLOW_REF,
  };
}

// Create child spans from processed markers
function createChildSpans(
  spanMarkers: Record<string, SpanMarker[]>,
  parentSpan: ReturnType<ReturnType<typeof trace.getTracer>["startSpan"]>,
): void {
  const tracer = trace.getTracer("workflow-tracer");

  for (const [spanName, occurrences] of Object.entries(spanMarkers)) {
    for (const marker of occurrences) {
      if (!marker.start || !marker.end) {
        core.debug(`Skipping incomplete span marker for "${spanName}"`);
        continue;
      }

      if (marker.end < marker.start) {
        core.warning(
          `Skipping span "${spanName}" due to end time (${marker.end.toISOString()}) before start time (${marker.start.toISOString()})`,
        );
        continue;
      }

      const child = tracer.startSpan(
        spanName,
        {
          kind: SpanKind.INTERNAL,
          startTime: marker.start,
        },
        trace.setSpan(otelContext.active(), parentSpan),
      );
      child.end(marker.end);
    }
  }
}

function isEventLine(line: TelemetryLine): line is EventLine {
  return line.type === "event";
}

function isSpanEndLine(line: TelemetryLine): line is SpanEndLine {
  return line.type === "spanEnd";
}

// Type guards
function isSpanStartLine(line: TelemetryLine): line is SpanStartLine {
  return line.type === "spanStart";
}

// Parse and validate a single NDJSON line
function parseTelemetryLine(rawLine: string): null | TelemetryLine {
  try {
    const parsed = JSON.parse(rawLine);

    // Infer type based on fields for backward compatibility
    if (parsed.span && parsed.startSpan) {
      parsed.type = "spanStart";
    } else if (parsed.span && parsed.endSpan) {
      parsed.type = "spanEnd";
    } else {
      parsed.type = "event";
    }

    const result = telemetryLineSchema.safeParse(parsed);
    if (!result.success) {
      core.warning("Invalid telemetry line format");
      core.debug(`Validation error: ${z.prettifyError(result.error)}`);
      return null;
    }
    return result.data;
  } catch {
    core.warning("Skipping malformed JSON telemetry line");
    return null;
  }
}

async function post(): Promise<void> {
  // Validate environment variables
  const envResult = postEnvSchema.safeParse(process.env);
  if (!envResult.success) {
    core.error(
      `Missing or invalid environment variables:\n${z.prettifyError(envResult.error)}`,
    );
    throw new Error("Environment validation failed");
  }

  const env = envResult.data;
  const workflowContext = getWorkflowContext(env);
  const startMs = parseInt(env.OTEL_SESSION_START, 10);
  const eventsFile = env.OTEL_EVENT_FILE;

  core.debug(`Post telemetry: file=${eventsFile}`);

  const workflowURL = `${workflowContext.serverUrl}/${workflowContext.repository}/actions/runs/${workflowContext.runId}`;

  const resource = resourceFromAttributes({
    "enduser.id": workflowContext.actor,
    "service.instance.id": workflowContext.runId,
    "service.name": workflowContext.workflowRef,
    "service.namespace": "dx",
  });

  useAzureMonitor({
    azureMonitorExporterOptions: {
      connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    enableLiveMetrics: false,
    resource,
  });

  const logger = logs.getLoggerProvider().getLogger("workflow-logger", "1.0.0");
  const tracer = trace.getTracer("workflow-tracer");

  const span = tracer.startSpan(workflowContext.workflow, {
    attributes: {
      "cicd.pipeline.action.name": workflowContext.workflow,
      "cicd.pipeline.attempt": workflowContext.runAttempt,
      "cicd.pipeline.author": workflowContext.actor,
      "cicd.pipeline.path": workflowContext.actionPath,
      "cicd.pipeline.repository": workflowContext.repository,
      "cicd.pipeline.result": env.PIPELINE_RESULT,
      "cicd.pipeline.run.id": workflowContext.runId,
      "cicd.pipeline.run.url.full": workflowURL,
      "cicd.pipeline.trigger": workflowContext.eventName,
      ...(env.NODE_PACKAGE_MANAGER
        ? { "node.package_manager": env.NODE_PACKAGE_MANAGER }
        : {}),
      ...(env.TERRAFORM_VERSION
        ? { "terraform.version": env.TERRAFORM_VERSION }
        : {}),
      ...(env.CSP_LIST ? { "cloud_provider.enabled": env.CSP_LIST } : {}),
    },
    kind: SpanKind.SERVER,
    startTime: new Date(startMs),
  });

  if (eventsFile && existsSync(eventsFile)) {
    const lines = readFileSync(eventsFile, "utf-8")
      .split(/\n/)
      .filter((l) => l.trim().length);

    if (lines.length === 0) {
      core.info(`Events file found but empty: ${eventsFile}.`);
    }

    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      const spanMarkers = processLinesAndGetMarkers(
        lines,
        span,
        logger,
        workflowContext,
      );
      createChildSpans(spanMarkers, span);
    });
  } else {
    core.info("No events file found");
  }

  span.end();

  // Flush all telemetry to Application Insights before process exit
  const FLUSH_TIMEOUT_MS = 10_000;
  try {
    const tracerProvider = trace.getTracerProvider() as {
      forceFlush?: (options?: { timeoutMillis?: number }) => Promise<void>;
    };
    const loggerProvider = logs.getLoggerProvider() as {
      forceFlush?: (options?: { timeoutMillis?: number }) => Promise<void>;
    };
    await Promise.all([
      tracerProvider.forceFlush?.({ timeoutMillis: FLUSH_TIMEOUT_MS }),
      loggerProvider.forceFlush?.({ timeoutMillis: FLUSH_TIMEOUT_MS }),
    ]);
  } catch (flushErr) {
    core.warning(
      `Telemetry flush error (some data may be lost): ${flushErr instanceof Error ? flushErr.message : String(flushErr)}`,
    );
  }

  core.info("Telemetry flushed");
}

// Process an individual event line
function processEventLine(
  line: EventLine,
  span: ReturnType<ReturnType<typeof trace.getTracer>["startSpan"]>,
  logger: ReturnType<ReturnType<typeof logs.getLoggerProvider>["getLogger"]>,
  workflowContext: WorkflowContext,
): void {
  // Fix: Standard attributes should override custom ones (not vice versa)
  const attrs = {
    ...line.attributes,
    "cicd.pipeline.repo": workflowContext.repository,
    "cicd.pipeline.run.id": workflowContext.runId,
    "enduser.id": workflowContext.actor,
  };

  if (line.exception) {
    span.recordException({
      message: line.body || line.name,
      name: line.name || "Exception",
    });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: line.body || line.name,
    });
    span.setAttribute("cicd.pipeline.result", "error");
  } else {
    logger.emit({
      attributes: {
        "microsoft.custom_event.name": line.name || "CustomEvent",
        ...attrs,
      },
      body: line.body || line.name,
    });
  }
}

// Process telemetry lines and return span markers
function processLinesAndGetMarkers(
  lines: string[],
  span: ReturnType<ReturnType<typeof trace.getTracer>["startSpan"]>,
  logger: ReturnType<ReturnType<typeof logs.getLoggerProvider>["getLogger"]>,
  workflowContext: WorkflowContext,
): Record<string, SpanMarker[]> {
  const spanMarkers: Record<string, SpanMarker[]> = {};

  for (const rawLine of lines) {
    const line = parseTelemetryLine(rawLine);
    if (!line) continue;

    // Handle span markers
    if (isSpanStartLine(line) || isSpanEndLine(line)) {
      const spanName = line.span;
      const arr = (spanMarkers[spanName] = spanMarkers[spanName] || []);

      let current = arr[arr.length - 1];
      if (!current || (current.start && current.end)) {
        current = {};
        arr.push(current);
      }

      if (isSpanStartLine(line)) {
        current.start = new Date(line.startSpan);
      } else if (isSpanEndLine(line)) {
        if (!current.start) {
          core.warning(
            `Orphaned endSpan for '${spanName}' at ${line.endSpan}: no matching startSpan.`,
          );
          current = { end: new Date(line.endSpan) };
          arr.push(current);
        } else {
          current.end = new Date(line.endSpan);
        }
      }
      continue;
    }

    // Handle event lines
    if (isEventLine(line)) {
      processEventLine(line, span, logger, workflowContext);
    }
  }

  return spanMarkers;
}

void post().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
