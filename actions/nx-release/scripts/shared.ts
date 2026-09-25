/**
 * Shared utilities for nx-release scripts.
 *
 * Provides common functions for:
 * - Authenticating with Octokit
 * - Parsing repository information
 * - Extracting tag metadata from PRs
 * - Matching tags to Nx project names
 */
import { Octokit } from "@octokit/rest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

/** Zod schemas for runtime validation */
const NonEmptyStringSchema = z.string().min(1);
const StringArraySchema = z.array(z.string());

const TagEntrySchema = z.object({
  path: z.string().nullable(),
  tag: z.string(),
  version: z.string(),
});

const ProjectMetadataSchema = z.looseObject({
  root: NonEmptyStringSchema.optional(),
});

export interface TagEntry {
  path: null | string;
  tag: string;
  version: string;
}

type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;

/** Creates an authenticated Octokit instance. */
export function createOctokit(): Octokit {
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GH_TOKEN environment variable is required but not set");
  }
  return new Octokit({ auth: token });
}

/**
 * Extracts tag entries from PR body metadata comment.
 * Returns an empty array if no metadata is found or parsing fails.
 */
export function extractTagEntriesFromPRBody(prBody: string): TagEntry[] {
  const match = prBody.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
  if (!match) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(match[1]);
    return parseTagEntries(parsed);
  } catch (err) {
    console.error("Failed to parse nx-release-tags JSON:", err);
    return [];
  }
}

/** Returns Nx project names, optionally restricted to projects exposing a target. */
export async function getNxProjectNames(
  targetName?: string,
): Promise<string[]> {
  try {
    const targetArgs = targetName ? ["--withTarget", targetName] : [];
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "projects",
      "--json",
      ...targetArgs,
    ]);
    // nx may print non-JSON text before the array (e.g. "[Maven Analyzer] ...").
    // Look for '["' (array of strings) or '[]' (empty array) to skip any prefix.
    let jsonStart = stdout.indexOf('["');
    if (jsonStart === -1) jsonStart = stdout.indexOf("[]");
    if (jsonStart === -1) {
      console.error(
        "nx show projects: no JSON array found in stdout:",
        stdout.slice(0, 300),
      );
      return [];
    }
    const parsed: unknown = JSON.parse(stdout.slice(jsonStart));
    const result = StringArraySchema.safeParse(parsed);
    if (!result.success) {
      console.error("nx show projects: validation failed:", result.error);
      return [];
    }
    return result.data;
  } catch (err) {
    console.error("getNxProjectNames failed:", err);
    return [];
  }
}

/**
 * Returns the root directory for a given Nx project name, or null on failure.
 */
export async function getNxProjectRoot(name: string): Promise<null | string> {
  const metadata = await getNxProjectMetadata(name);
  if (!metadata) return null;
  return metadata.root ?? null;
}

/** Parses owner and repo from GITHUB_REPOSITORY env var or git remote. */
export async function getRepoInfo(): Promise<{ owner: string; repo: string }> {
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

/**
 * Finds the longest project name that is a prefix of the tag, followed by a
 * non-word separator character (e.g. `@`, `/`, `-`).
 * Does NOT assume any specific separator - just checks that the character after
 * the project name is not alphanumeric.
 */
export function matchProjectName(
  tag: string,
  projectNames: string[],
): null | string {
  const candidates = projectNames.filter((name) => {
    if (!tag.startsWith(name)) return false;
    const charAfter = tag[name.length];
    return charAfter !== undefined && !/\w/.test(charAfter);
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
}

/**
 * Validates and parses raw JSON data into TagEntry array.
 * Filters out invalid entries.
 */
export function parseTagEntries(raw: unknown): TagEntry[] {
  const schema = z.array(TagEntrySchema);
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error("parseTagEntries: validation failed:", result.error);
    return [];
  }
  return result.data;
}

/**
 * Retrieves Nx project metadata by name.
 * Returns parsed JSON object or null on failure.
 * Used by getNxProjectRoot to resolve release tag paths.
 */
async function getNxProjectMetadata(
  projectName: string,
): Promise<null | ProjectMetadata> {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "project",
      projectName,
      "--json",
    ]);
    // nx may print banner/daemon text before the JSON object — find the first '{'
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      console.error(
        `nx show project ${projectName}: no JSON object found in stdout:`,
        stdout.slice(0, 200),
      );
      return null;
    }
    const parsed: unknown = JSON.parse(stdout.slice(jsonStart));
    const result = ProjectMetadataSchema.safeParse(parsed);
    if (!result.success) {
      console.error(
        `nx show project ${projectName}: validation failed:`,
        result.error,
      );
      return null;
    }
    return result.data;
  } catch (err) {
    console.error(`getNxProjectMetadata(${projectName}) failed:`, err);
    return null;
  }
}
