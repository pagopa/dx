/**
 * Setup Telemetry Action - Main Entry Point
 *
 * Initializes the OpenTelemetry session for GitHub Actions workflows by creating
 * a session directory and NDJSON events file, then exports environment variables
 * for use by subsequent workflow steps and the post-execution handler.
 */

import * as core from "@actions/core";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const SESSION_DIR = ".otel-session";

const envSchema = z.object({
  GITHUB_WORKSPACE: z.string().min(1),
});

const inputSchema = z.object({
  connectionString: z.string().min(1),
});

async function exportEnv(
  eventsFile: string,
  start: number,
  correlationId: string,
): Promise<void> {
  const inputResult = inputSchema.safeParse({
    connectionString: core.getInput("connection_string", { required: true }),
  });

  if (!inputResult.success) {
    core.error(
      `Missing or invalid action inputs:\n${z.prettifyError(inputResult.error)}`,
    );
    throw new Error("Input validation failed");
  }

  core.exportVariable("OTEL_EVENT_FILE", eventsFile);
  core.exportVariable("OTEL_SESSION_START", String(start));
  core.exportVariable("OTEL_CORRELATION_ID", correlationId);
  core.exportVariable(
    "APPLICATIONINSIGHTS_CONNECTION_STRING",
    inputResult.data.connectionString,
  );
}

async function run(): Promise<void> {
  try {
    const { correlationId, eventsFile, start } = await startSession();
    await exportEnv(eventsFile, start, correlationId);
    core.info(
      `Telemetry session started. Events file: ${eventsFile} correlationId=${correlationId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    core.setFailed(`setup-telemetry failed: ${message}`);
  }
}

async function startSession(): Promise<{
  correlationId: string;
  eventsFile: string;
  start: number;
}> {
  const envResult = envSchema
    .pick({ GITHUB_WORKSPACE: true })
    .safeParse(process.env);

  if (!envResult.success) {
    core.error(
      `Missing required environment variables:\n${z.prettifyError(envResult.error)}`,
    );
    throw new Error("Environment validation failed");
  }

  const start = Date.now();
  const sessionDir = path.join(envResult.data.GITHUB_WORKSPACE, SESSION_DIR);
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
