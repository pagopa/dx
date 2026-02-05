import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { z } from "zod";

const SESSION_DIR = ".otel-session";

const setupEnvSchema = z.object({
  GITHUB_ENV: z.string().min(1),
  INPUT_CONNECTION_STRING: z.string().min(1),
});

async function exportEnv(
  eventsFile: string,
  start: number,
  correlationId: string,
): Promise<void> {
  const envResult = setupEnvSchema.safeParse(process.env);
  if (!envResult.success) {
    console.error(
      "Missing required environment variables:",
      envResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
    );
    throw new Error("Environment validation failed");
  }

  const { GITHUB_ENV, INPUT_CONNECTION_STRING } = envResult.data;

  await fs.appendFile(GITHUB_ENV, `OTEL_EVENT_FILE=${eventsFile}\n`);
  await fs.appendFile(GITHUB_ENV, `OTEL_SESSION_START=${start}\n`);
  await fs.appendFile(GITHUB_ENV, `OTEL_CORRELATION_ID=${correlationId}\n`);
  await fs.appendFile(
    GITHUB_ENV,
    `APPLICATIONINSIGHTS_CONNECTION_STRING=${INPUT_CONNECTION_STRING}\n`,
  );
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
  await fs.mkdir(SESSION_DIR, { recursive: true });
  const eventsFile = `${SESSION_DIR}/events.ndjson`;
  try {
    await fs.access(eventsFile);
  } catch {
    await fs.writeFile(eventsFile, "");
  }
  const correlationId = randomUUID();
  return { correlationId, eventsFile, start };
}

run();
