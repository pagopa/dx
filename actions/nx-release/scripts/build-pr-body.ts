import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

type ReleaseEntry = {
  name: string;
  version: string;
  changelogPath: string;
};

/** Returns changed files in the current git working tree. */
function getChangedFiles(): string[] {
  const output = execSync("git diff --name-only", { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Reads package name/version from a package.json file. */
function parsePackageJson(
  path: string,
): { name: string; version: string } | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const raw = readFileSync(path, "utf8");
    const pkg = JSON.parse(raw) as { name?: string; version?: string };
    if (!pkg.name || !pkg.version) {
      return null;
    }
    return { name: pkg.name, version: pkg.version };
  } catch {
    return null;
  }
}

/** Extracts the first regex capture group from text, if present. */
function firstMatch(content: string, regex: RegExp): string {
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

/** Reads artifact name/version from a Maven pom.xml file. */
function parsePom(path: string): { name: string; version: string } | null {
  if (!existsSync(path)) {
    return null;
  }

  const raw = readFileSync(path, "utf8");
  const name = firstMatch(raw, /<artifactId>([^<]+)<\/artifactId>/);
  const version = firstMatch(raw, /<version>([^<]+)<\/version>/);

  if (!name || !version) {
    return null;
  }

  return { name, version };
}

/** Resolves release entries from changed manifests and changelog files. */
function resolveReleaseEntries(changedFiles: string[]): ReleaseEntry[] {
  const manifestCandidates = new Set<string>();

  for (const file of changedFiles) {
    if (file.endsWith("/package.json") || file.endsWith("/pom.xml")) {
      manifestCandidates.add(file);
    }

    if (file.endsWith("CHANGELOG.md")) {
      const folder = dirname(file);
      const packageJson = join(folder, "package.json");
      const pomXml = join(folder, "pom.xml");
      if (existsSync(packageJson)) {
        manifestCandidates.add(packageJson);
      } else if (existsSync(pomXml)) {
        manifestCandidates.add(pomXml);
      }
    }
  }

  const entries: ReleaseEntry[] = [];

  for (const manifestPath of manifestCandidates) {
    const parsed = manifestPath.endsWith("package.json")
      ? parsePackageJson(manifestPath)
      : parsePom(manifestPath);

    if (!parsed) {
      continue;
    }

    const changelogPath = join(dirname(manifestPath), "CHANGELOG.md");
    entries.push({
      name: parsed.name,
      version: parsed.version,
      changelogPath,
    });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/** Extracts the latest release section from a changelog file. */
function extractLatestSection(changelogPath: string): string[] {
  if (!existsSync(changelogPath)) {
    return [];
  }

  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const firstHeading = lines.findIndex((line) => /^##\s+/.test(line));
  if (firstHeading === -1) {
    return [];
  }

  let end = lines.length;
  for (let index = firstHeading + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }

  return lines.slice(firstHeading, end).map((line) => line.trimEnd());
}

/** Formats one package section for the release PR body. */
function formatReleaseSection(entry: ReleaseEntry): string {
  const sectionLines = extractLatestSection(entry.changelogPath);
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

/** Builds the full release PR body with Changesets-like structure. */
function buildBody(entries: ReleaseEntry[]): string {
  const intro = [
    "This PR was opened by the [Changesets release](https://github.com/changesets/action) GitHub action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more changesets to main, this PR will be updated.",
    "",
    "# Releases",
    "",
  ];

  if (entries.length === 0) {
    return `${intro.join("\n")}See individual packages CHANGELOGs for details.`;
  }

  const sections = entries.map((entry) => formatReleaseSection(entry));
  return `${intro.join("\n")}${sections.join("\n")}`.trim();
}

/** Main entrypoint: resolves entries, builds body, prints to stdout. */
function run(): void {
  const changedFiles = getChangedFiles();
  const entries = resolveReleaseEntries(changedFiles);
  const body = buildBody(entries);
  process.stdout.write(body);
}

run();
