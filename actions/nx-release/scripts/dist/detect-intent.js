import { execSync } from 'child_process';
import { readFileSync, appendFileSync } from 'fs';

// scripts/detect-intent.ts
var ZERO_SHA = "0000000000000000000000000000000000000000";
function appendOutput(outputPath, key, value) {
  appendFileSync(outputPath, `${key}=${value}
`);
}
function computeRange(event, githubSha) {
  const before = event.before ?? "";
  const after = event.after ?? githubSha ?? "HEAD";
  if (!before || before === ZERO_SHA) {
    return { base: "HEAD~1", head: "HEAD" };
  }
  return { base: before, head: after || "HEAD" };
}
function detectMode(diffStatus) {
  const lines = diffStatus.split("\n");
  const hasPlanAddOrModify = lines.some(
    (line) => /^[AMR].*\.nx\/version-plans?\//.test(line)
  );
  const hasPlanDelete = lines.some(
    (line) => /^[DR].*\.nx\/version-plans?\//.test(line)
  );
  const hasVersionBump = lines.some(
    (line) => /^[AMR].*(package\.json|pom\.xml)$/.test(line)
  );
  if (hasPlanAddOrModify) {
    return "create-pr";
  }
  if (hasPlanDelete && hasVersionBump) {
    return "publish";
  }
  return "noop";
}
function getEvent(eventPath) {
  try {
    const raw = readFileSync(eventPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const event = parsed;
    return {
      after: typeof event["after"] === "string" ? event["after"] : void 0,
      before: typeof event["before"] === "string" ? event["before"] : void 0
    };
  } catch {
    return {};
  }
}
function run() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const githubSha = process.env.GITHUB_SHA;
  const outputPath = process.env.GITHUB_OUTPUT;
  const event = eventPath ? getEvent(eventPath) : {};
  const { base, head } = computeRange(event, githubSha);
  console.log(`::notice::Analyzing diff range ${base}..${head}`);
  const diffStatus = execSync(
    `git diff --name-status ${shellEscape(base)} ${shellEscape(head)}`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  const mode = detectMode(diffStatus);
  if (outputPath) {
    appendOutput(outputPath, "mode", mode);
  }
  if (mode === "create-pr") {
    console.log(
      "::notice::Detected new/modified Nx version plans on main. Mode: create-pr"
    );
  } else if (mode === "publish") {
    console.log(
      "::notice::Detected consumed version plans and version bumps. Mode: publish"
    );
  } else {
    console.log("::notice::No Nx release action required. Mode: noop");
  }
}
function shellEscape(value) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
run();
