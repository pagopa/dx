import { mkdirSync, existsSync, writeFileSync, appendFileSync } from "fs";
import { randomUUID } from "crypto";

const SESSION_DIR = ".otel-session";

function startSession(): {
  eventsFile: string;
  start: number;
  correlationId: string;
} {
  const start = Date.now();
  mkdirSync(SESSION_DIR, { recursive: true });
  const eventsFile = `${SESSION_DIR}/events.ndjson`;
  if (!existsSync(eventsFile)) {
    writeFileSync(eventsFile, "");
  }
  const correlationId = randomUUID();
  return { eventsFile, start, correlationId };
}

function exportEnv(
  eventsFile: string,
  start: number,
  correlationId: string,
): void {
  const githubEnv = process.env.GITHUB_ENV;
  if (!githubEnv) {
    console.error("GITHUB_ENV not defined; cannot export variables");
    return;
  }
  appendFileSync(githubEnv, `OTEL_EVENT_FILE=${eventsFile}\n`);
  appendFileSync(githubEnv, `OTEL_SESSION_START=${start}\n`);
  appendFileSync(githubEnv, `OTEL_CORRELATION_ID=${correlationId}\n`);
}

async function run(): Promise<void> {
  try {
    const { eventsFile, start, correlationId } = startSession();
    exportEnv(eventsFile, start, correlationId);
    console.log(
      `Telemetry session started. Events file: ${eventsFile} correlationId=${correlationId}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("setup-telemetry failed:", message);
    process.exit(1);
  }
}

run();
