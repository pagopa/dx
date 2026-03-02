import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

// scripts/build-pr-body.ts
function buildBody(entries) {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    ""
  ];
  if (entries.length === 0) {
    return `${intro.join("\n")}See individual packages CHANGELOGs for details.`;
  }
  const sections = entries.map((entry) => formatReleaseSection(entry));
  return `${intro.join("\n")}${sections.join("\n")}`.trim();
}
function extractLatestSection(changelogPath) {
  if (!existsSync(changelogPath)) {
    return [];
  }
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const firstHeading = lines.findIndex((line) => /^##\s+/.test(line));
  if (firstHeading === -1) {
    return [];
  }
  const nextHeading = lines.findIndex(
    (line, i) => i > firstHeading && /^##\s+/.test(line)
  );
  const end = nextHeading === -1 ? lines.length : nextHeading;
  return lines.slice(firstHeading, end).map((line) => line.trimEnd());
}
function firstMatch(content, regex) {
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}
function formatReleaseSection(entry) {
  const sectionLines = extractLatestSection(entry.changelogPath);
  const output = [];
  output.push(`## ${entry.name}@${entry.version}`);
  output.push("");
  if (sectionLines.length === 0) {
    output.push("- No changelog entry found.");
    output.push("");
    return output.join("\n");
  }
  const bodyLines = sectionLines.slice(1).filter((line) => line.trim().length > 0);
  if (bodyLines.length === 0) {
    output.push("- No changelog entry found.");
    output.push("");
    return output.join("\n");
  }
  output.push(...bodyLines);
  output.push("");
  return output.join("\n");
}
function getChangedFiles() {
  const output = execSync("git diff HEAD --name-only", { encoding: "utf8" });
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}
function parsePackageJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const pkg = parsed;
    if (typeof pkg["name"] !== "string" || typeof pkg["version"] !== "string") {
      return null;
    }
    return { name: pkg["name"], version: pkg["version"] };
  } catch {
    return null;
  }
}
function parsePom(path) {
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
function resolveReleaseEntries(changedFiles) {
  const manifestCandidates = /* @__PURE__ */ new Set();
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
  const entries = [];
  for (const manifestPath of manifestCandidates) {
    const parsed = manifestPath.endsWith("package.json") ? parsePackageJson(manifestPath) : parsePom(manifestPath);
    if (!parsed) {
      continue;
    }
    const changelogPath = join(dirname(manifestPath), "CHANGELOG.md");
    entries.push({
      changelogPath,
      name: parsed.name,
      version: parsed.version
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
function run() {
  const changedFiles = getChangedFiles();
  const entries = resolveReleaseEntries(changedFiles);
  const body = buildBody(entries);
  process.stdout.write(body);
}
run();
