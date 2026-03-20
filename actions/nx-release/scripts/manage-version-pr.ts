/**
 * Manages the "Version Packages" PR: builds the PR body by reading RELEASE_TAGS
 * (JSON array of { tag, path, version } set by extract-tags.js), extracts the
 * latest changelog section from each project, and creates or updates the PR
 * using GitHub API (Octokit).
 */
import { Octokit } from "@octokit/rest";
import { execFile } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ReleaseEntry {
  changelogPath: string;
  name: string;
  version: string;
}

interface TagEntry {
  path: null | string;
  tag: string;
  version: string;
}

/** Writes an output key/value for downstream GitHub Action steps. */
async function appendOutput(key: string, value: string): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) {
    await appendFile(outputPath, `${key}=${value}\n`);
  }
}

/** Creates an authenticated Octokit instance. */
function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required but not set",
    );
  }
  return new Octokit({ auth: token });
}

/** Extracts the latest release section from a changelog file. */
async function extractLatestSection(changelogPath: string): Promise<string[]> {
  try {
    const lines = (await readFile(changelogPath, "utf8")).split("\n");
    const firstHeading = lines.findIndex((line) => /^##\s+/.test(line));
    if (firstHeading === -1) {
      return [];
    }

    const nextHeading = lines.findIndex(
      (line, i) => i > firstHeading && /^##\s+/.test(line),
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;

    return lines.slice(firstHeading, end).map((line) => line.trimEnd());
  } catch (err) {
    console.warn(`Could not read changelog at ${changelogPath}:`, err);
    return [];
  }
}

/** Formats one package section for the release PR body. */
async function formatReleaseSection(entry: ReleaseEntry): Promise<string> {
  const sectionLines = await extractLatestSection(entry.changelogPath);
  const output: string[] = [];

  output.push(`## ${entry.name}@${entry.version}`);
  output.push("");

  if (sectionLines.length === 0) {
    output.push("- No changelog entry found.");
    output.push("");
    return output.join("\n");
  }

  const bodyLines = sectionLines
    .slice(1)
    .filter((line) => line.trim().length > 0);

  if (bodyLines.length === 0) {
    output.push("- No changelog entry found.");
    output.push("");
    return output.join("\n");
  }

  output.push(...bodyLines);
  output.push("");
  return output.join("\n");
}

/** Parses owner and repo from GITHUB_REPOSITORY env var or git remote. */
async function getRepoInfo(): Promise<{ owner: string; repo: string }> {
  const ghRepo = process.env.GITHUB_REPOSITORY;
  if (ghRepo) {
    const [owner, repo] = ghRepo.split("/");
    if (owner && repo) return { owner, repo };
  }

  // Fallback: parse from git remote
  try {
    const { stdout } = await execFileAsync("git", [
      "remote",
      "get-url",
      "origin",
    ]);
    const match = stdout.match(/github\.com[:/]([^/]+)\/([^/\s]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch (err) {
    console.error("Failed to get repo info from git remote:", err);
  }

  throw new Error(
    "Could not determine repository owner/name from GITHUB_REPOSITORY or git remote",
  );
}

/** Validates that a value is a TagEntry array. */
function isTagEntryArray(value: unknown): value is TagEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>)["tag"] === "string" &&
        typeof (item as Record<string, unknown>)["version"] === "string" &&
        ((item as Record<string, unknown>)["path"] === null ||
          typeof (item as Record<string, unknown>)["path"] === "string"),
    )
  );
}

/** Resolves release entries from RELEASE_TAGS env var. */
function resolveReleaseEntries(): ReleaseEntry[] {
  const raw = process.env.RELEASE_TAGS ?? "[]";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(
      "[manage-version-pr] Failed to parse RELEASE_TAGS:",
      raw.slice(0, 200),
    );
    return [];
  }
  if (!isTagEntryArray(parsed)) {
    console.error(
      "[manage-version-pr] RELEASE_TAGS is not a valid TagEntry array",
    );
    return [];
  }
  const entries = parsed;
  return entries
    .filter((e): e is TagEntry & { path: string } => e.path !== null)
    .map((e) => ({
      changelogPath: join(e.path, "CHANGELOG.md"),
      name: e.tag.slice(0, e.tag.length - e.version.length - 1),
      version: e.version,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Main entrypoint: resolves entries, builds body, creates/updates PR. */
async function run(): Promise<void> {
  // Read required env vars
  const baseBranch = process.env.BASE_BRANCH ?? "main";
  const releaseBranch = process.env.RELEASE_BRANCH ?? "nx-release/main";
  const prTitle = process.env.PR_TITLE ?? "Version Packages";
  const releaseTags = process.env.RELEASE_TAGS ?? "[]";

  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    "",
  ].join("\n");

  const entries = resolveReleaseEntries();

  let prBody: string;
  if (entries.length === 0) {
    prBody = `${intro}See individual packages CHANGELOGs for details.`;
  } else {
    const sections = await Promise.all(entries.map(formatReleaseSection));
    prBody = `${intro}${sections.join("\n")}`.trim();
  }

  // Append release tags metadata comment
  prBody += `\n\n<!-- nx-release-tags: ${releaseTags} -->`;

  console.log("::notice::Building PR with Octokit API");
  const octokit = createOctokit();
  const { owner, repo } = await getRepoInfo();

  // Search for existing open PR from release branch to base branch
  const { data: existingPrs } = await octokit.pulls.list({
    base: baseBranch,
    head: `${owner}:${releaseBranch}`,
    owner,
    repo,
    state: "open",
  });

  if (existingPrs.length > 0) {
    // Update existing PR
    const prNumber = existingPrs[0].number;
    await octokit.pulls.update({
      body: prBody,
      owner,
      pull_number: prNumber,
      repo,
      title: prTitle,
    });

    const prUrl = existingPrs[0].html_url;
    console.log(`::notice::Updated existing release PR #${prNumber}`);
    console.log(`::notice::PR URL: ${prUrl}`);

    await appendOutput("pull-request-number", prNumber.toString());
    await appendOutput("pull-request-url", prUrl);
  } else {
    // Create new PR
    const { data: newPr } = await octokit.pulls.create({
      base: baseBranch,
      body: prBody,
      head: releaseBranch,
      owner,
      repo,
      title: prTitle,
    });

    console.log(`::notice::Created new release PR #${newPr.number}`);
    console.log(`::notice::PR URL: ${newPr.html_url}`);

    await appendOutput("pull-request-number", newPr.number.toString());
    await appendOutput("pull-request-url", newPr.html_url);
  }
}

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in manage-version-pr:", err);
    process.exit(1);
  });
}
