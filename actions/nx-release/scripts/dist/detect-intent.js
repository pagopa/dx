import { execSync } from "child_process";
import { readFileSync } from "fs";

// scripts/detect-intent.ts
var ZERO_SHA = "0000000000000000000000000000000000000000";
function appendOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  execSync(
    `printf '%s=%s
' ${shellEscape(key)} ${shellEscape(value)} >> ${shellEscape(outputPath)}`,
  );
}
function shellEscape(value) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
function getEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return {};
  }
  try {
    const raw = readFileSync(eventPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function computeRange() {
  const event = getEvent();
  const before = event.before ?? "";
  const after = event.after ?? process.env.GITHUB_SHA ?? "HEAD";
  if (!before || before === ZERO_SHA) {
    return { base: "HEAD~1", head: "HEAD" };
  }
  return { base: before, head: after || "HEAD" };
}
function detectMode(diffStatus) {
  const hasPlanAddOrModify = diffStatus
    .split("\n")
    .some((line) => /^[AMR].*\.nx\/version-plans?\//.test(line));
  const hasPlanDelete = diffStatus
    .split("\n")
    .some((line) => /^[DR].*\.nx\/version-plans?\//.test(line));
  const hasVersionBump = diffStatus
    .split("\n")
    .some((line) => /^[AMR].*(package\.json|pom\.xml)$/.test(line));
  if (hasPlanAddOrModify) {
    return "create-pr";
  }
  if (hasPlanDelete && hasVersionBump) {
    return "publish";
  }
  return "noop";
}
function run() {
  const { base, head } = computeRange();
  console.log(`::notice::Analyzing diff range ${base}..${head}`);
  const diffStatus = execSync(
    `git diff --name-status ${shellEscape(base)} ${shellEscape(head)}`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const mode = detectMode(diffStatus);
  appendOutput("mode", mode);
  if (mode === "create-pr") {
    console.log(
      "::notice::Detected new/modified Nx version plans on main. Mode: create-pr",
    );
  } else if (mode === "publish") {
    console.log(
      "::notice::Detected consumed version plans and version bumps. Mode: publish",
    );
  } else {
    console.log("::notice::No Nx release action required. Mode: noop");
  }
}
run();
