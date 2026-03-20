/**
 * Builds the release PR body by reading RELEASE_TAGS (JSON array of
 * { tag, path, version } set by extract-tags.js) and extracting the
 * latest changelog section from each project.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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
      "[build-pr-body] Failed to parse RELEASE_TAGS:",
      raw.slice(0, 200),
    );
    return [];
  }
  if (!isTagEntryArray(parsed)) {
    console.error("[build-pr-body] RELEASE_TAGS is not a valid TagEntry array");
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

/** Main entrypoint: resolves entries, builds body, prints to stdout. */
async function run(): Promise<void> {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    "",
  ].join("\n");

  const entries = resolveReleaseEntries();

  if (entries.length === 0) {
    process.stdout.write(
      `${intro}See individual packages CHANGELOGs for details.`,
    );
    return;
  }

  const sections = await Promise.all(entries.map(formatReleaseSection));
  process.stdout.write(`${intro}${sections.join("\n")}`.trim());
}

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in build-pr-body:", err);
    process.exit(1);
  });
}
