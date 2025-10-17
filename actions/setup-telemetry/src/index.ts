import { mkdirSync, existsSync, writeFileSync, appendFileSync } from "fs";

const SESSION_DIR = ".otel-session";

function startSession(): { eventsFile: string; start: number } {
  const start = Date.now();
  mkdirSync(SESSION_DIR, { recursive: true });
  const eventsFile = `${SESSION_DIR}/events.ndjson`;
  if (!existsSync(eventsFile)) {
    writeFileSync(eventsFile, "");
  }
  return { eventsFile, start };
}

function exportEnv(eventsFile: string, start: number): void {
  const githubEnv = process.env.GITHUB_ENV;
  if (!githubEnv) {
    console.error("GITHUB_ENV not defined; cannot export variables");
    return;
  }
  appendFileSync(githubEnv, `OTEL_EVENT_FILE=${eventsFile}\n`);
  appendFileSync(githubEnv, `OTEL_SESSION_START=${start}\n`);
}

async function run(): Promise<void> {
  try {
    const { eventsFile, start } = startSession();
    exportEnv(eventsFile, start);
    console.log(`Telemetry session started. Events file: ${eventsFile}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("setup-telemetry failed:", message);
    process.exit(1);
  }
}

run();
