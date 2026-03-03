/**
 * Builds the release PR body by extracting the latest changelog section
 * from each package bumped in the current commit.
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

import { readPackageJson, readPomXml } from "./shared.js";

interface ReleaseEntry {
  changelogPath: string;
  name: string;
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
  } catch {
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

/** Returns changed files relative to HEAD (staged and unstaged). */
async function getChangedFiles(): Promise<string[]> {
  const { stdout } = await execFileAsync("git", [
    "diff",
    "HEAD",
    "--name-only",
  ]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Resolves release entries from changed manifests and changelog files. */
async function resolveReleaseEntries(
  changedFiles: string[],
): Promise<ReleaseEntry[]> {
  const manifestCandidates = new Set<string>();

  for (const file of changedFiles) {
    if (file.endsWith("/package.json") || file.endsWith("/pom.xml")) {
      manifestCandidates.add(file);
    }

    if (file.endsWith("CHANGELOG.md")) {
      const folder = dirname(file);
      // Add both candidates — the parsing step filters out missing files
      manifestCandidates.add(join(folder, "package.json"));
      manifestCandidates.add(join(folder, "pom.xml"));
    }
  }

  const entries = await Promise.all(
    [...manifestCandidates].map(async (manifestPath) => {
      const parsed = manifestPath.endsWith("package.json")
        ? await readPackageJson(manifestPath)
        : await readPomXml(manifestPath);

      if (!parsed) {
        return null;
      }

      return {
        changelogPath: join(dirname(manifestPath), "CHANGELOG.md"),
        name: parsed.name,
        version: parsed.version,
      };
    }),
  );

  return entries
    .filter((e): e is ReleaseEntry => e !== null)
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

  const changedFiles = await getChangedFiles();
  const entries = await resolveReleaseEntries(changedFiles);

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
