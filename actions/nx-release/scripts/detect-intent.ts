import { execa } from "execa";
/**
 * Inspects the current git push event to determine which Nx release mode
 * ("create-pr", "publish", or "noop") should run, then writes it to
 * GITHUB_OUTPUT for downstream steps.
 */
import { appendFile, readFile } from "node:fs/promises";

export type ReleaseMode = "create-pr" | "noop" | "publish";

interface GithubPushEvent {
  after?: string;
  before?: string;
}

export const ZERO_SHA = "0000000000000000000000000000000000000000";

/** Computes the git range to inspect for this workflow execution. */
export function computeRange(
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
export function detectMode(diffStatus: string): ReleaseMode {
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

/** Writes an output key/value for downstream GitHub Action steps. */
async function appendOutput(
  outputPath: string,
  key: string,
  value: string,
): Promise<void> {
  await appendFile(outputPath, `${key}=${value}\n`);
}

/** Reads the GitHub push event payload from a file path. */
async function getEvent(eventPath: string): Promise<GithubPushEvent> {
  try {
    const raw = await readFile(eventPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const event = parsed as Record<string, unknown>;
    return {
      after: typeof event["after"] === "string" ? event["after"] : undefined,
      before: typeof event["before"] === "string" ? event["before"] : undefined,
    };
  } catch (err) {
    console.error("Failed to read event payload:", err);
    return {};
  }
}

/** Main entrypoint: inspects diff, detects mode, and exposes action output. */
async function run(): Promise<void> {
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

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in detect-intent:", err);
    process.exit(1);
  });
}
