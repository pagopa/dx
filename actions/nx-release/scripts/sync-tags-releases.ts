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

import {
  createOctokit,
  extractTagEntriesFromPRBody,
  getRepoInfo,
  type TagEntry,
} from "./shared.js";

const execFileAsync = promisify(execFile);

/** Zod schemas for runtime validation */
const OctokitErrorSchema = z.object({
  status: z.number(),
});

const PrDataSchema = z.object({
  body: z.string(),
  mergeCommit: z
    .object({
      oid: z.string(),
    })
    .optional(),
  mergedAt: z.string().optional(),
  number: z.number(),
});

const PrDataArraySchema = z.array(PrDataSchema);

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
  } catch {
    return null;
  }
}

const getReleaseByTag404Error =
  /GET \/repos\/[^/]+\/[^/]+\/releases\/tags\/[^/]+ - 404\b/;

/** Number of releases requested per page. */
const RELEASES_PER_PAGE = 100;

/**
 * Safety margin applied to the recovery-window cutoff. The GitHub releases API
 * is approximately but not strictly ordered by `created_at` (adjacent release
 * runs can interleave by a few hours), so we keep paging slightly past the
 * oldest candidate to avoid stopping before an existing release scrolls into
 * view.
 */
const RELEASE_WINDOW_MARGIN_MS = 24 * 60 * 60 * 1000;

const AlreadyExistsErrorSchema = z.object({
  response: z
    .object({
      data: z
        .object({
          errors: z.array(z.object({ code: z.string() })).optional(),
        })
        .optional(),
    })
    .optional(),
  status: z.number(),
});

/**
 * The narrow slice of the GitHub client used to list releases. Depending on
 * this interface (instead of the whole Octokit instance) keeps the dependency
 * explicit and lets callers and tests provide their own implementation.
 */
export interface ReleaseLister {
  listReleases(params: {
    owner: string;
    page: number;
    per_page: number;
    repo: string;
  }): Promise<{ data: { created_at: string; tag_name: string }[] }>;
}

/**
 * Lists existing release tags, stopping once the recovery window is covered
 * instead of paginating the entire repository history.
 *
 * Releases are returned newest-first, so releases for the tags in the recovery
 * window sit near the top. Pagination stops when:
 * - every candidate tag has been found (exact and ordering-independent), or
 * - the page reaches releases older than the recovery-window cutoff, after
 *   which no candidate release can exist, or
 * - the last page is reached.
 *
 * Because the API ordering is only approximate, a candidate missed here is
 * created optimistically by the caller, which treats an "already exists"
 * response as success.
 */
export async function getExistingReleaseTags(
  lister: ReleaseLister,
  owner: string,
  repo: string,
  candidateTags: ReadonlySet<string>,
  notBefore?: Date,
): Promise<Set<string>> {
  const found = new Set<string>();
  const cutoff =
    notBefore === undefined
      ? null
      : notBefore.getTime() - RELEASE_WINDOW_MARGIN_MS;

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: releases } = await lister.listReleases({
      owner,
      page,
      per_page: RELEASES_PER_PAGE,
      repo,
    });

    if (releases.length === 0) break;

    let reachedCutoff = false;
    for (const release of releases) {
      found.add(release.tag_name);
      if (cutoff !== null && Date.parse(release.created_at) < cutoff) {
        reachedCutoff = true;
      }
    }

    const allCandidatesFound =
      candidateTags.size > 0 &&
      [...candidateTags].every((tag) => found.has(tag));

    hasMore =
      !allCandidatesFound &&
      !reachedCutoff &&
      releases.length >= RELEASES_PER_PAGE;
    page += 1;
  }

  return found;
}

/**
 * Fetches every tag currently on the remote in a single network round-trip.
 *
 * Probing each tag with its own `git ls-remote` call made this step take minutes
 * on repositories with many tags, since the recovery window spans the tags of
 * up to 20 merged PRs.
 */
export async function getRemoteTagNames(): Promise<Set<string>> {
  const { stdout } = await execFileAsync("git", [
    "ls-remote",
    "--tags",
    "--refs",
    "origin",
  ]);
  return parseRemoteTagRefs(stdout);
}

/** True when GitHub rejected a create because the resource already exists. */
export function isAlreadyExistsError(err: unknown): boolean {
  const parsed = AlreadyExistsErrorSchema.safeParse(err);
  if (!parsed.success || parsed.data.status !== 422) return false;
  return (parsed.data.response?.data?.errors ?? []).some(
    (e) => e.code === "already_exists",
  );
}

/**
 * Parses `git ls-remote --tags --refs` output into a set of tag names.
 * Returns names without the `refs/tags/` prefix.
 */
export function parseRemoteTagRefs(stdout: string): Set<string> {
  const tags = new Set<string>();
  for (const line of stdout.split("\n")) {
    const ref = line.trim().split("\t")[1];
    if (ref?.startsWith("refs/tags/")) {
      // `--refs` omits peeled `^{}` entries, but strip them defensively anyway.
      tags.add(ref.slice("refs/tags/".length).replace(/\^\{\}$/, ""));
    }
  }
  return tags;
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
      request: {
        // Suppress noisy 404 logs from Octokit when release doesn't exist
        log: {
          error: (...args: unknown[]) => {
            const message = args.join(" ");
            if (getReleaseByTag404Error.test(message)) {
              // Suppress this specific 404 error
              return;
            }
            // Log other errors normally
            console.error(...args);
          },
        },
      },
      tag,
    });
    return true;
  } catch (err: unknown) {
    const errorCheck = OctokitErrorSchema.safeParse(err);
    if (errorCheck.success && errorCheck.data.status === 404) {
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
      mergedAt: pr.merged_at ?? undefined,
      number: pr.number,
    }));

  const validationResult = PrDataArraySchema.safeParse(mergedPrs);
  if (!validationResult.success) {
    console.error("PR data validation failed:", validationResult.error);
    throw new Error("Unexpected PR list response: not an array of PR data");
  }
  const validatedPrs = validationResult.data;

  // Collect all tag entries from every merged Version Packages PR.
  // Map keyed by tag deduplicates across PRs (e.g. same package bumped multiple times).
  // Store merge commit SHA for each tag to ensure tags point to the correct commit.
  const allEntries = new Map<string, TagEntry & { mergeCommitSha?: string }>();
  for (const pr of validatedPrs) {
    if (!pr.body) continue;
    const mergeCommitSha = pr.mergeCommit?.oid;
    const tagEntries = extractTagEntriesFromPRBody(pr.body);
    for (const e of tagEntries) {
      allEntries.set(e.tag, { ...e, mergeCommitSha });
    }
  }

  if (allEntries.size === 0) {
    console.log("No release tags found in merged Version Packages PRs");
    return;
  }

  // Bound the release lookup to the recovery window: releases are only needed
  // for tags that came from these PRs, so pagination can stop around the oldest
  // of their merge times instead of walking the whole repository history.
  const candidateTags = new Set(allEntries.keys());
  const oldestMergedAt = validatedPrs
    .map((pr) => pr.mergedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(0);
  const notBefore = oldestMergedAt ? new Date(oldestMergedAt) : undefined;

  // Snapshot remote state once instead of probing each tag individually.
  // Both checks below are network round-trips and the recovery window can span
  // hundreds of tags across 20 merged PRs, so per-tag probing dominated runtime.
  const [remoteTags, existingReleaseTags] = await Promise.all([
    getRemoteTagNames(),
    getExistingReleaseTags(
      octokit.repos,
      owner,
      repo,
      candidateTags,
      notBefore,
    ).catch((err: unknown) => {
      console.warn(
        "Could not list existing releases, falling back to per-tag checks:",
        err,
      );
      return null;
    }),
  ]);

  const newTags: (TagEntry & { mergeCommitSha?: string })[] = [];
  for (const entry of allEntries.values()) {
    if (remoteTags.has(entry.tag)) {
      console.log(`Tag ${entry.tag} already exists, skipping`);
      continue;
    }
    // Create tag on the merge commit SHA if available, otherwise on current HEAD
    const tagArgs = ["tag", "-a", entry.tag, "-m", `Release ${entry.tag}`];
    if (entry.mergeCommitSha) {
      tagArgs.push(entry.mergeCommitSha);
      console.log(
        `Creating tag ${entry.tag} on commit ${entry.mergeCommitSha.slice(0, 7)}`,
      );
    } else {
      console.log(
        `::warning::No merge commit SHA found for ${entry.tag}, tagging current HEAD`,
      );
    }
    await execFileAsync("git", tagArgs);
    newTags.push(entry);
    console.log(`Created tag: ${entry.tag}`);
  }

  if (newTags.length === 0) {
    console.log("No new tags to push");
  } else {
    // Push tags one by one so GitHub emits a push event for each tag.
    // GitHub does not create tag push events when more than three tags are
    // pushed in a single operation.
    // https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
    for (const { tag } of newTags) {
      await execFileAsync("git", ["push", "origin", `refs/tags/${tag}`]);
      console.log(`Pushed tag: ${tag}`);
    }
  }

  for (const { path, tag, version } of allEntries.values()) {
    const alreadyReleased =
      existingReleaseTags === null
        ? await releaseExists(octokit, owner, repo, tag)
        : existingReleaseTags.has(tag);

    if (alreadyReleased) {
      console.log(`GitHub release ${tag} already exists, skipping`);
      continue;
    }

    let notes = `Release ${tag}`;

    if (path) {
      const clPath = join(path, "CHANGELOG.md");
      const section = await extractChangelogSection(clPath, version);
      if (section) notes = section;
    }

    try {
      await octokit.repos.createRelease({
        body: notes,
        name: tag,
        owner,
        prerelease: version.includes("-"),
        repo,
        tag_name: tag,
      });
      console.log(`Created GitHub release: ${tag}`);
    } catch (err: unknown) {
      // Early stopping means a pre-existing release may not have been listed.
      // Creating it again is rejected with `already_exists`, which is success.
      if (isAlreadyExistsError(err)) {
        console.log(`GitHub release ${tag} already exists, skipping`);
        continue;
      }
      throw err;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.env.BASE_BRANCH ?? "main").catch((err: unknown) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}
