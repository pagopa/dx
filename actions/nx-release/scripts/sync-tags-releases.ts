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
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const TagEntrySchema = z.object({
  path: z.string().nullable(),
  tag: z.string(),
  // version was added later; default to "" for PR bodies written before this field.
  version: z.string().default(""),
});

const PrDataSchema = z.object({
  body: z.string(),
  number: z.number(),
});

const PrListSchema = z.array(PrDataSchema);

export type TagEntry = z.infer<typeof TagEntrySchema>;

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
    "100",
    "--json",
    "number,body",
  ]);

  const parseResult = PrListSchema.safeParse(JSON.parse(stdout));
  if (!parseResult.success) {
    throw new Error(
      `Unexpected gh pr list response: ${parseResult.error.message}`,
    );
  }

  // Collect all tag entries from every merged Version Packages PR.
  // Map keyed by tag deduplicates across PRs (e.g. same package bumped multiple times).
  const allEntries = new Map<string, TagEntry>();
  for (const pr of parseResult.data) {
    if (!pr.body) continue;
    const m = pr.body.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
    if (!m) continue;
    const entriesResult = z.array(TagEntrySchema).safeParse(JSON.parse(m[1]));
    if (entriesResult.success) {
      for (const e of entriesResult.data) allEntries.set(e.tag, e);
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
      const clPath = join(dirname(path), "CHANGELOG.md");
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

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.env.BASE_BRANCH ?? "main").catch((err: unknown) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}
