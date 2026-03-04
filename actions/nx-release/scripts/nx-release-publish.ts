/**
 * Runs the Nx Release publish phase via the programmatic API, then creates
 * annotated git tags and GitHub releases for every successfully published
 * package. Combines two separate steps (publish + tag sync)
 * into one, using structured publish results instead of scanning manifests.
 *
 * Expected environment variables:
 *   GITHUB_TOKEN   — token used by the gh CLI to create releases
 *   GITHUB_OUTPUT  — path to GitHub Actions output file
 */
import type { releasePublish } from "nx/release";

import { execFile, spawn } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

/**
 * Loads nx/release from the consumer workspace's node_modules.
 * See nx-release-version.ts for the rationale behind dynamic import.
 */
async function loadNxRelease(): Promise<{
  releasePublish: typeof releasePublish;
}> {
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const nxReleasePath = pathToFileURL(
    join(workspaceRoot, "node_modules/nx/release/index.js"),
  ).href;
  return import(nxReleasePath) as Promise<{
    releasePublish: typeof releasePublish;
  }>;
}

const execFileAsync = promisify(execFile);

interface PackageInfo {
  name: string;
  root: string;
  version: string;
}

/** Writes an output key/value for downstream GitHub Action steps. */
async function appendOutput(
  outputPath: string,
  key: string,
  value: string,
): Promise<void> {
  await appendFile(outputPath, `${key}=${value}\n`);
}

/** Creates a GitHub release for a tag if it does not already exist. */
async function createGitHubRelease(
  tagName: string,
  notes: string,
  prerelease: boolean,
): Promise<void> {
  try {
    await execFileAsync("gh", ["release", "view", tagName]);
    console.log(`::notice::GitHub release ${tagName} already exists, skipping`);
    return;
  } catch {
    // Release does not exist — proceed to create it
  }

  const args = [
    "release",
    "create",
    tagName,
    "--title",
    tagName,
    "--notes",
    notes,
  ];

  if (prerelease) {
    args.push("--prerelease");
  }

  await spawnInherit("gh", args);
  console.log(`::notice::Created GitHub release ${tagName}`);
}

/** Extracts the changelog section for a specific version from CHANGELOG.md. */
async function extractReleaseNotes(pkg: PackageInfo): Promise<string> {
  const changelogPath = join(pkg.root, "CHANGELOG.md");

  try {
    const lines = (await readFile(changelogPath, "utf8")).split("\n");
    const versionPattern = new RegExp(
      `^##\\s+\\[?${pkg.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`,
    );

    const start = lines.findIndex((line) => versionPattern.test(line));
    if (start === -1) {
      return `Release ${pkg.name}@${pkg.version}`;
    }

    const nextHeading = lines.findIndex(
      (line, i) => i > start && /^##\s+/.test(line),
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;

    return (
      lines.slice(start, end).join("\n").trim() ||
      `Release ${pkg.name}@${pkg.version}`
    );
  } catch (err) {
    console.warn(`Could not read changelog for ${pkg.name}:`, err);
    return `Release ${pkg.name}@${pkg.version}`;
  }
}

/**
 * Resolves the npm package name, version, and root directory for an Nx project
 * by querying `nx show project` and reading its package.json.
 */
async function getPackageInfo(
  projectName: string,
): Promise<null | PackageInfo> {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "project",
      projectName,
      "--json",
    ]);

    const project = JSON.parse(stdout) as Record<string, unknown>;
    const root = typeof project["root"] === "string" ? project["root"] : null;
    if (!root) {
      return null;
    }

    const pkgJson = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    ) as Record<string, unknown>;

    const name = typeof pkgJson["name"] === "string" ? pkgJson["name"] : null;
    const version =
      typeof pkgJson["version"] === "string" ? pkgJson["version"] : null;

    if (!name || !version) {
      return null;
    }

    return { name, root, version };
  } catch (err) {
    console.warn(`Failed to get package info for project ${projectName}:`, err);
    return null;
  }
}

/** Main entrypoint: publishes packages, creates git tags, and GitHub releases. */
async function run(): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;

  // ── Phase 1: publish ───────────────────────────────────────────────────────
  const { releasePublish } = await loadNxRelease();

  console.log("::notice::Running Nx Release publish phase");
  const publishResults = await releasePublish({});

  const successfulProjects = Object.entries(publishResults)
    .filter(([, result]) => result.code === 0)
    .map(([name]) => name);

  const failedProjects = Object.entries(publishResults)
    .filter(([, result]) => result.code !== 0)
    .map(([name]) => name);

  if (failedProjects.length > 0) {
    console.error(`::error::Failed to publish: ${failedProjects.join(", ")}`);
  }

  // ── Phase 2: resolve package metadata ─────────────────────────────────────
  const packages = (
    await Promise.all(successfulProjects.map(getPackageInfo))
  ).filter((p): p is PackageInfo => p !== null);

  // ── Phase 3: create git tags ───────────────────────────────────────────────
  const createdTags: string[] = [];

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
      `Release ${pkg.name} ${pkg.version}`,
    ]);
    createdTags.push(tagName);
  }

  // ── Phase 4: push tags + create GitHub releases ────────────────────────────
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

  // ── Phase 5: write outputs ─────────────────────────────────────────────────
  if (outputPath) {
    await appendOutput(
      outputPath,
      "published",
      successfulProjects.length > 0 ? "true" : "false",
    );
    await appendOutput(outputPath, "tags", createdTags.join(" "));
  }

  if (failedProjects.length > 0) {
    process.exit(1);
  }
}

/** Runs a command and streams its output to the current terminal. */
function spawnInherit(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`${cmd} ${args.join(" ")} exited with code ${code}`),
          ),
    );
    child.on("error", reject);
  });
}

/** Checks whether a tag exists locally or on origin. */
async function tagExists(tagName: string): Promise<boolean> {
  // Check local refs first (fast)
  try {
    await execFileAsync("git", [
      "rev-parse",
      "-q",
      "--verify",
      `refs/tags/${tagName}`,
    ]);
    return true;
  } catch {
    // Non-zero exit means the tag does not exist locally
  }

  // Fall back to remote check
  try {
    const { stdout } = await execFileAsync("git", [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tagName}`,
    ]);
    return stdout.length > 0;
  } catch (err) {
    console.warn(`Failed to check remote tag ${tagName}:`, err);
    return false;
  }
}

// Only execute when run directly as a script, not when imported in tests
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in nx-release-publish:", err);
    process.exit(1);
  });
}
