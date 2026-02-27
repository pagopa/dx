import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

type ReleaseMode = "create-pr" | "publish" | "noop";

type GithubPushEvent = {
  before?: string;
  after?: string;
};

const ZERO_SHA = "0000000000000000000000000000000000000000";

/** Writes an output key/value for downstream GitHub Action steps. */
function appendOutput(key: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  execSync(
    `printf '%s=%s\n' ${shellEscape(key)} ${shellEscape(value)} >> ${shellEscape(outputPath)}`,
  );
}

/** Escapes shell arguments to avoid command injection and quoting issues. */
function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

/** Reads the GitHub push event payload from GITHUB_EVENT_PATH. */
function getEvent(): GithubPushEvent {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return {};
  }

  try {
    const raw = readFileSync(eventPath, "utf8");
    return JSON.parse(raw) as GithubPushEvent;
  } catch {
    return {};
  }
}

/** Computes the git range to inspect for this workflow execution. */
function computeRange(): { base: string; head: string } {
  const event = getEvent();
  const before = event.before ?? "";
  const after = event.after ?? process.env.GITHUB_SHA ?? "HEAD";

  if (!before || before === ZERO_SHA) {
    return { base: "HEAD~1", head: "HEAD" };
  }

  return { base: before, head: after || "HEAD" };
}

/** Detects which release mode should run based on changed files. */
function detectMode(diffStatus: string): ReleaseMode {
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

/** Main entrypoint: inspects diff, detects mode, and exposes action output. */
function run(): void {
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
