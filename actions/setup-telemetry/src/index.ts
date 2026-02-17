/**
 * Setup Telemetry Action - Main Entry Point
 *
 * Initializes the OpenTelemetry session for GitHub Actions workflows by creating
 * a session directory and NDJSON events file, then exports environment variables
 * for use by subsequent workflow steps and the post-execution handler.
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import { z } from "zod";

const SESSION_DIR = ".otel-session";

// Validate required environment variables
const envSchema = z.object({
  GITHUB_ENV: z.string().min(1),
  INPUT_CONNECTION_STRING: z.string().min(1),
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

async function run(): Promise<void> {
  try {
    const { correlationId, eventsFile, start } = await startSession();
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

async function startSession(): Promise<{
  correlationId: string;
  eventsFile: string;
  start: number;
}> {
  const start = Date.now();

  // Create session directory with error handling
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create session directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const eventsFile = `${SESSION_DIR}/events.ndjson`;

  // Initialize empty events file
  try {
    await fs.writeFile(eventsFile, "", { flag: "wx" });
  } catch (err) {
    // File already exists or other error - only throw on non-EEXIST errors
    if (err instanceof Error && "code" in err && err.code !== "EEXIST") {
      throw new Error(`Failed to initialize events file: ${err.message}`);
    }
  }

  const correlationId = randomUUID();
  return { correlationId, eventsFile, start };
}

run();
