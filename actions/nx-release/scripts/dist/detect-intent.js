import { execa } from './chunk-N4R2TMCK.js';
import { readFile, appendFile } from 'fs/promises';

var ZERO_SHA = "0000000000000000000000000000000000000000";
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
async function appendOutput(outputPath, key, value) {
  await appendFile(outputPath, `${key}=${value}
`);
}
async function getEvent(eventPath) {
  try {
    const raw = await readFile(eventPath, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const event = parsed;
    return {
      after: typeof event["after"] === "string" ? event["after"] : void 0,
      before: typeof event["before"] === "string" ? event["before"] : void 0
    };
  } catch (err) {
    console.error("Failed to read event payload:", err);
    return {};
  }
}
async function run() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const githubSha = process.env.GITHUB_SHA;
  const outputPath = process.env.GITHUB_OUTPUT;
  const event = eventPath ? await getEvent(eventPath) : {};
  const { base, head } = computeRange(event, githubSha);
  console.log(`::notice::Analyzing diff range ${base}..${head}`);
  const { stdout } = await execa("git", ["diff", "--name-status", base, head]);
  const mode = detectMode(stdout);
  if (outputPath) {
    await appendOutput(outputPath, "mode", mode);
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
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in detect-intent:", err);
    process.exit(1);
  });
}

export { ZERO_SHA, computeRange, detectMode };
