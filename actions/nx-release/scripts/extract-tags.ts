/**
 * Reads a list of tags created by `nx release --skip-publish`, resolves the
 * project root for each via `nx show project`, and writes a JSON array of
 * { path, tag, version } entries to stdout.
 *
 * Matching: `nx show projects --json` returns full project names (e.g.
 * `@dx/app-x`) which are the exact prefix of each tag.
 * The longest prefix match wins.
 *
 * Used to populate the nx-release-tags metadata comment in the Version Packages PR body.
 */
import {
  getNxProjectNames,
  getNxProjectRoot,
  matchProjectName,
  type TagEntry,
} from "./shared.js";

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
