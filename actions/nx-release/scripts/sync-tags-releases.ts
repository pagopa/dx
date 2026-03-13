/**
 * Queries all merged "Version Packages" PRs, collects the nx-release-tags metadata
 * embedded in each PR body, and creates any missing git tags and GitHub Releases.
 *
 * Fully idempotent: skips tags and releases that already exist.
 * Recovery-capable: scanning ALL past merged PRs ensures a single workflow_dispatch
 * catches up on every tag missed across multiple failed publish runs.
 */
import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface TagEntry {
  path: null | string;
  tag: string;
  // version was added later; may be absent in PR bodies written before this field.
  version: string;
}

interface PrData {
  body: string;
  number: number;
}

/**
 * Extracts the changelog section matching `version` from a CHANGELOG.md file.
 * Returns null when the file cannot be read or the version heading is not found.
 */
export async function extractChangelogSection(
  clPath: string,
  version: string,
): Promise<null | string> {
  try {
    const lines = (await readFile(clPath, "utf8")).split("\n");
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pat = new RegExp(`^##\\s+.*${escapedVersion}`);
    const s = lines.findIndex((l) => pat.test(l));
    if (s < 0) return null;
    const e = lines.findIndex((l, i) => i > s && /^##\s/.test(l));
    return lines
      .slice(s, e < 0 ? undefined : e)
      .join("\n")
      .trim();
  } catch {
    return null;
  }
}

export async function releaseExists(tag: string): Promise<boolean> {
  try {
    await execFileAsync("gh", ["release", "view", tag]);
    return true;
  } catch {
    return false;
  }
}

export async function run(base: string): Promise<void> {
  const { stdout } = await execFileAsync("gh", [
    "pr",
    "list",
    "--state",
    "merged",
    "--head",
    "nx-release/main",
    "--base",
    base,
    "--limit",
    // Scanning the last 20 merged PRs is enough to recover from any realistic
    // sequence of failed publish runs without making the step noticeably slow.
    "20",
    "--json",
    "number,body",
  ]);

  const parsed: unknown = JSON.parse(stdout);
  if (!isPrDataArray(parsed)) {
    throw new Error("Unexpected gh pr list response: not an array of PR data");
  }

  // Collect all tag entries from every merged Version Packages PR.
  // Map keyed by tag deduplicates across PRs (e.g. same package bumped multiple times).
  const allEntries = new Map<string, TagEntry>();
  for (const pr of parsed) {
    if (!pr.body) continue;
    const m = pr.body.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
    if (!m) continue;
    for (const e of parseTagEntries(JSON.parse(m[1]))) {
      allEntries.set(e.tag, e);
    }
  }

  if (allEntries.size === 0) {
    console.log(
      "::notice::No release tags found in merged Version Packages PRs",
    );
    return;
  }

  const newTags: TagEntry[] = [];
  for (const entry of allEntries.values()) {
    if (await tagExistsOnRemote(entry.tag)) {
      console.log(`::notice::Tag ${entry.tag} already exists, skipping`);
      continue;
    }
    await spawnInherit("git", [
      "tag",
      "-a",
      entry.tag,
      "-m",
      `Release ${entry.tag}`,
    ]);
    newTags.push(entry);
    console.log(`::notice::Created tag: ${entry.tag}`);
  }

  if (newTags.length === 0) {
    console.log("::notice::No new tags to push");
    return;
  }

  await spawnInherit("git", ["push", "origin", "--tags"]);

  for (const { path, tag, version } of newTags) {
    let notes = `Release ${tag}`;

    if (path) {
      const clPath = join(path, "CHANGELOG.md");
      const section = await extractChangelogSection(clPath, version);
      if (section) notes = section;
    }

    if (await releaseExists(tag)) {
      console.log(`::notice::GitHub release ${tag} already exists, skipping`);
      continue;
    }

    const args = ["release", "create", tag, "--title", tag, "--notes", notes];
    if (version.includes("-")) args.push("--prerelease");
    await spawnInherit("gh", args);
    console.log(`::notice::Created GitHub release: ${tag}`);
  }
}

export function spawnInherit(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`${cmd} ${args.join(" ")} exited with code ${code}`),
          ),
    );
    child.on("error", reject);
  });
}

export async function tagExistsOnRemote(tag: string): Promise<boolean> {
  const { stdout } = await execFileAsync("git", [
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`,
  ]);
  return stdout.trim().length > 0;
}

function isPrDataArray(value: unknown): value is PrData[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>)["body"] === "string" &&
        typeof (item as Record<string, unknown>)["number"] === "number",
    )
  );
}

function parseTagEntries(raw: unknown): TagEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const r = item as Record<string, unknown>;
    if (typeof r["tag"] !== "string") return [];
    return [
      {
        path: typeof r["path"] === "string" ? r["path"] : null,
        tag: r["tag"],
        version: typeof r["version"] === "string" ? r["version"] : "",
      },
    ];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.env.BASE_BRANCH ?? "main").catch((err: unknown) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}
