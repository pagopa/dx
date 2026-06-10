/**
 * Setup Telemetry Action - Main Entry Point
 *
 * Initializes the OpenTelemetry session for GitHub Actions workflows by creating
 * a session directory and NDJSON events file, then exports environment variables
 * for use by subsequent workflow steps and the post-execution handler.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const SESSION_DIR = ".otel-session";
const DEFAULT_CONNECTION_STRING =
  "InstrumentationKey=9c95698f-d74e-4046-a555-ea5f632c307e;IngestionEndpoint=https://italynorth-0.in.applicationinsights.azure.com/;LiveEndpoint=https://italynorth.livediagnostics.monitor.azure.com/;ApplicationId=c6f1af09-fbb3-4770-bf6d-cdaf821d2699";

interface ResolvedConnectionString {
  connectionString: string;
  source: "default" | "input";
}

// Validate required environment variables
const envSchema = z.object({
  GITHUB_ENV: z.string().min(1),
  GITHUB_WORKSPACE: z.string().min(1),
  INPUT_CONNECTION_STRING: z
    .string()
    .optional()
    .transform((value) => value?.trim() || DEFAULT_CONNECTION_STRING),
});

async function exportEnv(
  eventsFile: string,
  start: number,
  correlationId: string,
): Promise<void> {
  const envResult = envSchema.safeParse(process.env);

  if (!envResult.success) {
    console.error(
      "Missing required environment variables:",
      z.prettifyError(envResult.error),
    );
    throw new Error("Environment validation failed");
  }

  const { GITHUB_ENV, INPUT_CONNECTION_STRING } = envResult.data;

  const envVars =
    [
      `OTEL_EVENT_FILE=${eventsFile}`,
      `OTEL_SESSION_START=${start}`,
      `OTEL_CORRELATION_ID=${correlationId}`,
      `APPLICATIONINSIGHTS_CONNECTION_STRING=${INPUT_CONNECTION_STRING}`,
    ].join("\n") + "\n";

  await fs.appendFile(GITHUB_ENV, envVars);
}

function getConnectionStringMetadata(connectionString: string): {
  applicationId?: string;
  ingestionEndpoint?: string;
} {
  return connectionString.split(";").reduce(
    (metadata, part) => {
      const [key, ...valueParts] = part.split("=");
      const value = valueParts.join("=");

      if (key === "ApplicationId") {
        return { ...metadata, applicationId: value };
      }

      if (key === "IngestionEndpoint") {
        return { ...metadata, ingestionEndpoint: value };
      }

      return metadata;
    },
    {} as { applicationId?: string; ingestionEndpoint?: string },
  );
}

function logTelemetryTarget({
  connectionString,
  source,
}: ResolvedConnectionString): void {
  const { applicationId, ingestionEndpoint } =
    getConnectionStringMetadata(connectionString);

  console.log(
    `Telemetry target resolved from ${source}: applicationId=${applicationId || "unknown"} ingestionEndpoint=${ingestionEndpoint || "unknown"}`,
  );
}

function resolveConnectionString(
  value: string | undefined,
): ResolvedConnectionString {
  const connectionString = value?.trim();

  if (connectionString) {
    return { connectionString, source: "input" };
  }

  return { connectionString: DEFAULT_CONNECTION_STRING, source: "default" };
}

async function run(): Promise<void> {
  try {
    const envResult = envSchema.safeParse(process.env);

    if (!envResult.success) {
      console.error(
        "Missing required environment variables:",
        z.prettifyError(envResult.error),
      );
      throw new Error("Environment validation failed");
    }

    const { correlationId, eventsFile, start } = await startSession(
      envResult.data.GITHUB_WORKSPACE,
    );
    logTelemetryTarget(
      resolveConnectionString(process.env.INPUT_CONNECTION_STRING),
    );
    await exportEnv(eventsFile, start, correlationId);
    console.log(
      `Telemetry session started. Events file: ${eventsFile} correlationId=${correlationId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("setup-telemetry failed:", message);
    process.exit(1);
  }
}

async function startSession(workspace: string): Promise<{
  correlationId: string;
  eventsFile: string;
  start: number;
}> {
  const start = Date.now();
  const sessionDir = path.join(workspace, SESSION_DIR);
  const eventsFile = path.join(sessionDir, "events.ndjson");

  // Create session directory with error handling
  try {
    await fs.mkdir(sessionDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create session directory: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }

  // Initialize empty events file
  try {
    await fs.writeFile(eventsFile, "", { flag: "w" });
  } catch (err) {
    // File already exists or other error - only throw on non-EEXIST errors
    if (err instanceof Error && "code" in err && err.code !== "EEXIST") {
      throw new Error(`Failed to initialize events file: ${err.message}`, {
        cause: err,
      });
    }
  }

  const correlationId = randomUUID();
  return { correlationId, eventsFile, start };
}

run();
