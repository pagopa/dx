/**
 * Reads a list of tags created by `nx release --skip-publish`, resolves the
 * project root for each via `nx show project`, and writes a JSON array of
 * { path, tag, version } entries to stdout.
 *
 * Matching: `nx show projects --json` returns full project names (e.g.
 * `@selfcare/infra-dev-iam-ms`) which are the exact prefix of each tag.
 * The longest prefix match wins.
 *
 * Used to populate the nx-release-tags metadata comment in the Version Packages PR body.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface TagEntry {
  path: null | string;
  tag: string;
  version: string;
}

/**
 * Maps each Nx-generated tag to its project root path and version.
 */
export async function buildTagEntries(newTags: string[]): Promise<TagEntry[]> {
  const projectNames = await getNxProjectNames();

  return Promise.all(
    newTags.map(async (tag) => {
      const name = matchProjectName(tag, projectNames);
      if (!name) {
        // Fallback: extract version as the trailing semver-like segment
        const m = tag.match(/[^\w](\d[\w.-]*)$/);
        const version = m ? m[1] : tag;
        return { path: null, tag, version };
      }
      // Version is everything after the project name and its separator character
      const version = tag.slice(name.length + 1);
      // path = the project root directory from `nx show project <name> --json`
      const path = await getNxProjectRoot(name);
      return { path, tag, version };
    }),
  );
}

/** Returns all Nx project names in the workspace. */
export async function getNxProjectNames(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "projects",
      "--json",
    ]);
    const parsed: unknown = JSON.parse(stdout);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string")
      ? (parsed as string[])
      : [];
  } catch {
    return [];
  }
}

/**
 * Returns the root directory for a given Nx project name, or null on failure.
 */
export async function getNxProjectRoot(name: string): Promise<null | string> {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "project",
      name,
      "--json",
    ]);
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== "object" || parsed === null) return null;
    const root = (parsed as Record<string, unknown>)["root"];
    return typeof root === "string" && root ? root : null;
  } catch {
    return null;
  }
}

/**
 * Finds the longest project name that is a prefix of the tag, followed by a
 * non-word separator character (e.g. `@`, `/`).
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const newTags = (process.env.NEW_TAGS ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (newTags.length === 0) {
    console.log("[]");
  } else {
    buildTagEntries(newTags)
      .then((entries) => console.log(JSON.stringify(entries)))
      .catch((err: unknown) => {
        console.error("Unexpected error in extract-tags:", err);
        process.exit(1);
      });
  }
}
