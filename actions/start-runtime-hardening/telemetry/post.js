import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

try {
  execFileSync(
    "bash",
    [
      fileURLToPath(new URL("collect.sh", import.meta.url)),
      "/tmp/falco_events.json",
      "/var/log/gha-agent/connections.log",
    ],
    { stdio: "inherit" },
  );
} catch (error) {
  console.warn(
    `::warning::Runtime hardening telemetry collection failed: ${error.message}`,
  );
}
