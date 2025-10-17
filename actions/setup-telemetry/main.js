const core = require("@actions/core");
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
    // Export environment variables for subsequent steps
    core.exportVariable("OTEL_EVENT_FILE", eventsFile);
    core.exportVariable("OTEL_SESSION_START", start.toString());
    core.info(`Telemetry session started. Events file: ${eventsFile}`);
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
