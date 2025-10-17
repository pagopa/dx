// Lightweight implementation without @actions/core (dependency not vendored)
const fs = require("fs");
const path = ".otel-session";

async function run() {
  try {
    const start = Date.now();
    fs.mkdirSync(path, { recursive: true });
    const eventsFile = `${path}/events.ndjson`;
    if (!fs.existsSync(eventsFile)) {
      fs.writeFileSync(eventsFile, "");
    }
    // Export environment variables for subsequent steps via GITHUB_ENV
    const githubEnv = process.env.GITHUB_ENV;
    if (!githubEnv) {
      console.error('GITHUB_ENV not defined; cannot export variables');
    } else {
      fs.appendFileSync(githubEnv, `OTEL_EVENT_FILE=${eventsFile}\n`);
      fs.appendFileSync(githubEnv, `OTEL_SESSION_START=${start}\n`);
    }
    console.log(`Telemetry session started. Events file: ${eventsFile}`);
  } catch (err) {
  console.error('setup-telemetry failed:', err.message);
  process.exit(1);
  }
}

run();
