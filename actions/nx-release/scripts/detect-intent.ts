/**
 * Inspects the current git push event to determine which Nx release mode
 * ("create-pr", "publish", or "noop") should run, then writes it to
 * GITHUB_OUTPUT for downstream steps.
 */
import { execSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

interface GithubPushEvent {
  after?: string;
  before?: string;
}

type ReleaseMode = "create-pr" | "noop" | "publish";

const ZERO_SHA = "0000000000000000000000000000000000000000";

/** Writes an output key/value for downstream GitHub Action steps. */
function appendOutput(outputPath: string, key: string, value: string): void {
  appendFileSync(outputPath, `${key}=${value}\n`);
}

/** Computes the git range to inspect for this workflow execution. */
function computeRange(
  event: GithubPushEvent,
  githubSha: string | undefined,
): { base: string; head: string } {
  const before = event.before ?? "";
  const after = event.after ?? githubSha ?? "HEAD";

  if (!before || before === ZERO_SHA) {
    return { base: "HEAD~1", head: "HEAD" };
  }

  return { base: before, head: after || "HEAD" };
}

/** Detects which release mode should run based on changed files. */
function detectMode(diffStatus: string): ReleaseMode {
  const lines = diffStatus.split("\n");

  const hasPlanAddOrModify = lines.some((line) =>
    /^[AMR].*\.nx\/version-plans?\//.test(line),
  );
  const hasPlanDelete = lines.some((line) =>
    /^[DR].*\.nx\/version-plans?\//.test(line),
  );
  const hasVersionBump = lines.some((line) =>
    /^[AMR].*(package\.json|pom\.xml)$/.test(line),
  );

  if (hasPlanAddOrModify) {
    return "create-pr";
  }

  if (hasPlanDelete && hasVersionBump) {
    return "publish";
  }

  return "noop";
}

/** Reads the GitHub push event payload from a file path. */
function getEvent(eventPath: string): GithubPushEvent {
  try {
    const raw = readFileSync(eventPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const event = parsed as Record<string, unknown>;
    return {
      after: typeof event["after"] === "string" ? event["after"] : undefined,
      before: typeof event["before"] === "string" ? event["before"] : undefined,
    };
  } catch {
    return {};
  }
}

/** Main entrypoint: inspects diff, detects mode, and exposes action output. */
function run(): void {
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
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const mode = detectMode(diffStatus);

  if (outputPath) {
    appendOutput(outputPath, "mode", mode);
  }

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

/** Escapes shell arguments to avoid command injection and quoting issues. */
function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

run();
