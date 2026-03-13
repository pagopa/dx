import { readFile } from 'fs/promises';
import { join } from 'path';

// scripts/build-pr-body.ts
async function extractLatestSection(changelogPath) {
  try {
    const lines = (await readFile(changelogPath, "utf8")).split("\n");
    const firstHeading = lines.findIndex((line) => /^##\s+/.test(line));
    if (firstHeading === -1) {
      return [];
    }
    const nextHeading = lines.findIndex(
      (line, i) => i > firstHeading && /^##\s+/.test(line)
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;
    return lines.slice(firstHeading, end).map((line) => line.trimEnd());
  } catch (err) {
    console.warn(`Could not read changelog at ${changelogPath}:`, err);
    return [];
  }
}
async function formatReleaseSection(entry) {
  const sectionLines = await extractLatestSection(entry.changelogPath);
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
function resolveReleaseEntries() {
  const raw = process.env.RELEASE_TAGS ?? "[]";
  let entries;
  try {
    entries = JSON.parse(raw);
  } catch {
    console.error(
      "[build-pr-body] Failed to parse RELEASE_TAGS:",
      raw.slice(0, 200)
    );
    return [];
  }
  return entries.filter((e) => e.path !== null).map((e) => ({
    changelogPath: join(e.path, "CHANGELOG.md"),
    name: e.tag.slice(0, e.tag.length - e.version.length - 1),
    version: e.version
  })).sort((a, b) => a.name.localeCompare(b.name));
}
async function run() {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    ""
  ].join("\n");
  const entries = resolveReleaseEntries();
  if (entries.length === 0) {
    process.stdout.write(
      `${intro}See individual packages CHANGELOGs for details.`
    );
    return;
  }
  const sections = await Promise.all(entries.map(formatReleaseSection));
  process.stdout.write(`${intro}${sections.join("\n")}`.trim());
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in build-pr-body:", err);
    process.exit(1);
  });
}
