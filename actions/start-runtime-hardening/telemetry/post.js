import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { fetchTimeline } from "./timeline.js";

const execFileAsync = promisify(execFile);
let timeline = [];
try {
  timeline = await fetchTimeline({
    apiUrl: process.env.GITHUB_API_URL,
    now: Date.now(),
    repository: process.env.GITHUB_REPOSITORY,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    runId: process.env.GITHUB_RUN_ID,
    runnerName: process.env.RUNNER_NAME,
    token: process.env.DX_RUNTIME_HARDENING_TOKEN,
  });
} catch (error) {
  console.warn(
    `::warning::Could not correlate runtime events with job steps: ${error.message}`,
  );
}

let directory;
try {
  directory = await mkdtemp(
    join(process.env.RUNNER_TEMP || tmpdir(), "dx-hardening-timeline-"),
  );
  const timelineFile = join(directory, "steps.json");
  await writeFile(timelineFile, JSON.stringify(timeline));
  const { stderr, stdout } = await execFileAsync("bash", [
    fileURLToPath(new URL("collect.sh", import.meta.url)),
    "/tmp/falco_events.json",
    "/var/log/gha-agent/connections.log",
    timelineFile,
  ]);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
} catch (error) {
  console.warn(
    `::warning::Runtime hardening telemetry collection failed: ${error.message}`,
  );
} finally {
  if (directory) {
    try {
      await rm(directory, { force: true, recursive: true });
    } catch (error) {
      console.warn(
        `::warning::Could not remove the temporary step timeline: ${error.message}`,
      );
    }
  }
}
