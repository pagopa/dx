import { execFile } from 'child_process';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { promisify } from 'util';

// scripts/build-pr-body.ts
async function readPackageJson(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const pkg = parsed;
    if (typeof pkg["name"] !== "string" || typeof pkg["version"] !== "string") {
      return null;
    }
    return { name: pkg["name"], raw: pkg, version: pkg["version"] };
  } catch {
    return null;
  }
}
async function readPomXml(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const name = raw.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]?.trim() ?? "";
    const version = raw.match(/<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "";
    if (!name || !version) {
      return null;
    }
    return { name, version };
  } catch {
    return null;
  }
}

// scripts/build-pr-body.ts
var execFileAsync = promisify(execFile);
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
  } catch {
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
async function getChangedFiles() {
  const { stdout } = await execFileAsync("git", [
    "diff",
    "HEAD",
    "--name-only"
  ]);
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}
async function resolveReleaseEntries(changedFiles) {
  const manifestCandidates = /* @__PURE__ */ new Set();
  for (const file of changedFiles) {
    if (file.endsWith("/package.json") || file.endsWith("/pom.xml")) {
      manifestCandidates.add(file);
    }
    if (file.endsWith("CHANGELOG.md")) {
      const folder = dirname(file);
      manifestCandidates.add(join(folder, "package.json"));
      manifestCandidates.add(join(folder, "pom.xml"));
    }
  }
  const entries = await Promise.all(
    [...manifestCandidates].map(async (manifestPath) => {
      const parsed = manifestPath.endsWith("package.json") ? await readPackageJson(manifestPath) : await readPomXml(manifestPath);
      if (!parsed) {
        return null;
      }
      return {
        changelogPath: join(dirname(manifestPath), "CHANGELOG.md"),
        name: parsed.name,
        version: parsed.version
      };
    })
  );
  return entries.filter((e) => e !== null).sort((a, b) => a.name.localeCompare(b.name));
}
async function run() {
  const intro = [
    "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more Nx version plans to main, this PR will be updated.",
    "",
    "# Releases",
    ""
  ].join("\n");
  const changedFiles = await getChangedFiles();
  const entries = await resolveReleaseEntries(changedFiles);
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
