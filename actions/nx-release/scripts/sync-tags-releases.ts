/**
 * Queries merged "Version Packages" PRs, collects the nx-release-tags metadata
 * embedded in each PR body, and creates any missing git tags and GitHub Releases.
 *
 * Fully idempotent: skips tags and releases that already exist.
 * Recovery-capable: scans up to 20 recent merged PRs to catch up on tags
 * missed across failed publish runs.
 */
import { Octokit } from "@octokit/rest";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const tagEntrySchema = z.object({
  path: z.string().nullable(),
  tag: z.string(),
  version: z.string(),
});

export type TagEntry = z.infer<typeof tagEntrySchema>;

const tagEntryInputSchema = z.object({
  path: z.string().nullable().optional(),
  tag: z.string().optional(),
  version: z.string().optional(),
}).transform((value) => ({
  path: value.path ?? null,
  tag: value.tag ?? "",
  version: value.version ?? "",
}));

const prDataSchema = z.object({
  body: z.string(),
  mergeCommit: z
    .object({
      oid: z.string(),
    })
    .optional(),
  number: z.number(),
});

const prDataArraySchema = z.array(prDataSchema);

const releaseNotFoundSchema = z.object({
  status: z.literal(404),
});

/**
 * Extracts the changelog section matching `version` from a CHANGELOG.md file.
 * Returns null when the file cannot be read or the version heading is not found.
 */
export async function extractChangelogSection(
  clPath: string,
  version: string,
): Promise<null | string> {
  // Treat missing/empty version as "no extraction"
  if (!version || version.trim() === "") {
    console.warn(
      `Version is empty or missing for changelog at ${clPath}, skipping section extraction`,
    );
    return null;
  }
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
  } catch (err) {
    console.warn(
      `Could not read changelog at ${clPath} to extract section for version ${version}:`,
      err,
    );
    return null;
  }
}

export async function releaseExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  tag: string,
): Promise<boolean> {
  try {
    await octokit.repos.getReleaseByTag({
      owner,
      repo,
      tag,
    });
    return true;
  } catch (err: unknown) {
    // 404 means release doesn't exist
    if (releaseNotFoundSchema.safeParse(err).success) {
      return false;
    }
    // Other errors should be logged but treated as "doesn't exist"
    console.warn(`Error checking release ${tag}:`, err);
    return false;
  }
}

export async function run(base: string): Promise<void> {
  const octokit = createOctokit();
  const { owner, repo } = await getRepoInfo();

  // List merged PRs from nx-release/main branch
  const { data: pulls } = await octokit.pulls.list({
    base,
    direction: "desc",
    head: `${owner}:nx-release/main`,
    owner,
    per_page: 20,
    repo,
    sort: "updated",
    state: "closed",
  });

  // Filter only merged PRs and extract body + merge commit
  const mergedPrs = pulls
    .filter((pr) => pr.merged_at !== null)
    .map((pr) => ({
      body: pr.body ?? "",
      mergeCommit: pr.merge_commit_sha
        ? { oid: pr.merge_commit_sha }
        : undefined,
      number: pr.number,
    }));

  const mergedPrsResult = prDataArraySchema.safeParse(mergedPrs);
  if (!mergedPrsResult.success) {
    throw new Error("Unexpected PR list response: not an array of PR data");
  }

  // Collect all tag entries from every merged Version Packages PR.
  // Map keyed by tag deduplicates across PRs (e.g. same package bumped multiple times).
  // Store merge commit SHA for each tag to ensure tags point to the correct commit.
  const allEntries = new Map<string, TagEntry & { mergeCommitSha?: string }>();
  for (const pr of mergedPrsResult.data) {
    if (!pr.body) continue;
    const m = pr.body.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
    if (!m) continue;
    const mergeCommitSha = pr.mergeCommit?.oid;
    for (const e of parseTagEntries(JSON.parse(m[1]))) {
      allEntries.set(e.tag, { ...e, mergeCommitSha });
    }
  }

  if (allEntries.size === 0) {
    console.log(
      "::notice::No release tags found in merged Version Packages PRs",
    );
    return;
  }

  const newTags: (TagEntry & { mergeCommitSha?: string })[] = [];
  for (const entry of allEntries.values()) {
    if (await tagExistsOnRemote(entry.tag)) {
      console.log(`::notice::Tag ${entry.tag} already exists, skipping`);
      continue;
    }
    // Create tag on the merge commit SHA if available, otherwise on current HEAD
    const tagArgs = ["tag", "-a", entry.tag, "-m", `Release ${entry.tag}`];
    if (entry.mergeCommitSha) {
      tagArgs.push(entry.mergeCommitSha);
      console.log(
        `::notice::Creating tag ${entry.tag} on commit ${entry.mergeCommitSha.slice(0, 7)}`,
      );
    } else {
      console.log(
        `::warning::No merge commit SHA found for ${entry.tag}, tagging current HEAD`,
      );
    }
    await execFileAsync("git", tagArgs);
    newTags.push(entry);
    console.log(`::notice::Created tag: ${entry.tag}`);
  }

  if (newTags.length === 0) {
    console.log("::notice::No new tags to push");
    return;
  }

  await execFileAsync("git", ["push", "origin", "--tags"]);

  for (const { path, tag, version } of newTags) {
    let notes = `Release ${tag}`;

    if (path) {
      const clPath = join(path, "CHANGELOG.md");
      const section = await extractChangelogSection(clPath, version);
      if (section) notes = section;
    }

    if (await releaseExists(octokit, owner, repo, tag)) {
      console.log(`::notice::GitHub release ${tag} already exists, skipping`);
      continue;
    }

    await octokit.repos.createRelease({
      body: notes,
      name: tag,
      owner,
      prerelease: version.includes("-"),
      repo,
      tag_name: tag,
    });
    console.log(`::notice::Created GitHub release: ${tag}`);
  }
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

function parseTagEntries(raw: unknown): TagEntry[] {
  const arrayResult = z.array(z.unknown()).safeParse(raw);
  if (!arrayResult.success) return [];

  return arrayResult.data.flatMap((item) => {
    const parsed = tagEntryInputSchema.safeParse(item);

    if (!parsed.success) return [];
    return [parsed.data];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.env.BASE_BRANCH ?? "main").catch((err: unknown) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}
