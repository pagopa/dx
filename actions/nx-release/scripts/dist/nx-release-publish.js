import { execFile, spawn } from 'child_process';
import { readFile, appendFile } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';

// scripts/nx-release-publish.ts
async function loadNxRelease() {
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const nxReleasePath = pathToFileURL(
    join(workspaceRoot, "node_modules/nx/release/index.js")
  ).href;
  return import(nxReleasePath);
}
var execFileAsync = promisify(execFile);
async function appendOutput(outputPath, key, value) {
  await appendFile(outputPath, `${key}=${value}
`);
}
async function createGitHubRelease(tagName, notes, prerelease) {
  try {
    await execFileAsync("gh", ["release", "view", tagName]);
    console.log(`::notice::GitHub release ${tagName} already exists, skipping`);
    return;
  } catch {
  }
  const args = [
    "release",
    "create",
    tagName,
    "--title",
    tagName,
    "--notes",
    notes
  ];
  if (prerelease) {
    args.push("--prerelease");
  }
  await spawnInherit("gh", args);
  console.log(`::notice::Created GitHub release ${tagName}`);
}
async function extractReleaseNotes(pkg) {
  const changelogPath = join(pkg.root, "CHANGELOG.md");
  try {
    const lines = (await readFile(changelogPath, "utf8")).split("\n");
    const versionPattern = new RegExp(
      `^##\\s+\\[?${pkg.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
    );
    const start = lines.findIndex((line) => versionPattern.test(line));
    if (start === -1) {
      return `Release ${pkg.name}@${pkg.version}`;
    }
    const nextHeading = lines.findIndex(
      (line, i) => i > start && /^##\s+/.test(line)
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;
    return lines.slice(start, end).join("\n").trim() || `Release ${pkg.name}@${pkg.version}`;
  } catch (err) {
    console.warn(`Could not read changelog for ${pkg.name}:`, err);
    return `Release ${pkg.name}@${pkg.version}`;
  }
}
async function getPackageInfo(projectName) {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "project",
      projectName,
      "--json"
    ]);
    const project = JSON.parse(stdout);
    const root = typeof project["root"] === "string" ? project["root"] : null;
    if (!root) {
      return null;
    }
    const pkgJson = JSON.parse(
      await readFile(join(root, "package.json"), "utf8")
    );
    const name = typeof pkgJson["name"] === "string" ? pkgJson["name"] : null;
    const version = typeof pkgJson["version"] === "string" ? pkgJson["version"] : null;
    if (!name || !version) {
      return null;
    }
    return { name, root, version };
  } catch (err) {
    console.warn(`Failed to get package info for project ${projectName}:`, err);
    return null;
  }
}
async function run() {
  const outputPath = process.env.GITHUB_OUTPUT;
  const { releasePublish } = await loadNxRelease();
  console.log("::notice::Running Nx Release publish phase");
  const publishResults = await releasePublish({});
  const successfulProjects = Object.entries(publishResults).filter(([, result]) => result.code === 0).map(([name]) => name);
  const failedProjects = Object.entries(publishResults).filter(([, result]) => result.code !== 0).map(([name]) => name);
  if (failedProjects.length > 0) {
    console.error(`::error::Failed to publish: ${failedProjects.join(", ")}`);
  }
  const packages = (await Promise.all(successfulProjects.map(getPackageInfo))).filter((p) => p !== null);
  const createdTags = [];
  for (const pkg of packages) {
    const tagName = `${pkg.name}@${pkg.version}`;
    if (await tagExists(tagName)) {
      console.log(`::notice::Tag ${tagName} already exists, skipping`);
      continue;
    }
    console.log(`::notice::Creating tag ${tagName}`);
    await spawnInherit("git", [
      "tag",
      "-a",
      tagName,
      "-m",
      `Release ${pkg.name} ${pkg.version}`
    ]);
    createdTags.push(tagName);
  }
  if (createdTags.length > 0) {
    console.log(`::notice::Pushing ${createdTags.length} tags to origin`);
    await spawnInherit("git", ["push", "origin", "--tags"]);
    for (const pkg of packages) {
      const tagName = `${pkg.name}@${pkg.version}`;
      if (!createdTags.includes(tagName)) {
        continue;
      }
      const notes = await extractReleaseNotes(pkg);
      const prerelease = pkg.version.includes("-");
      await createGitHubRelease(tagName, notes, prerelease);
    }
  }
  if (outputPath) {
    await appendOutput(
      outputPath,
      "published",
      successfulProjects.length > 0 ? "true" : "false"
    );
    await appendOutput(outputPath, "tags", createdTags.join(" "));
  }
  if (failedProjects.length > 0) {
    process.exit(1);
  }
}
function spawnInherit(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on(
      "close",
      (code) => code === 0 ? resolve() : reject(
        new Error(`${cmd} ${args.join(" ")} exited with code ${code}`)
      )
    );
    child.on("error", reject);
  });
}
async function tagExists(tagName) {
  try {
    await execFileAsync("git", [
      "rev-parse",
      "-q",
      "--verify",
      `refs/tags/${tagName}`
    ]);
    return true;
  } catch {
  }
  try {
    const { stdout } = await execFileAsync("git", [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tagName}`
    ]);
    return stdout.length > 0;
  } catch (err) {
    console.warn(`Failed to check remote tag ${tagName}:`, err);
    return false;
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in nx-release-publish:", err);
    process.exit(1);
  });
}
