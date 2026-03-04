/**
 * Runs the Nx Release publish phase via the programmatic API, then creates
 * annotated git tags and GitHub releases for every successfully published
 * package.
 *
 * After publish, the npm registry — not `publishResults` — is the source of
 * truth for determining which packages need a git tag and GitHub release.
 * This makes the entire flow idempotent: if the action is re-run after a
 * partial failure, packages already on npm get their missing tags/releases
 * created without attempting to re-publish them.
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
  /** Whether the package has `"private": true` in package.json (not published to npm). */
  private: boolean;
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

    const isPrivate = pkgJson["private"] === true;
    return { name, private: isPrivate, root, version };
  } catch (err) {
    console.warn(`Failed to get package info for project ${projectName}:`, err);
    return null;
  }
}

/**
 * Checks whether a specific version of an npm package is published on the
 * registry.  Returns true even when the package was published in a previous
 * action run that failed before creating the git tag — this is what makes the
 * publish phase idempotent.
 */
async function isPublishedOnNpm(
  name: string,
  version: string,
): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("npm", [
      "view",
      `${name}@${version}`,
      "version",
      "--json",
    ]);
    return stdout.trim().replace(/^"|"$/g, "") === version;
  } catch {
    return false;
  }
}

/** Main entrypoint: publishes packages, creates git tags, and GitHub releases. */
async function run(): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;

  // ── Phase 1: publish ───────────────────────────────────────────────────────
  const { releasePublish } = await loadNxRelease();

  console.log("::notice::Running Nx Release publish phase");
  const publishResults = await releasePublish({});

  const failedProjects = Object.entries(publishResults)
    .filter(([, result]) => result.code !== 0)
    .map(([name]) => name);

  if (failedProjects.length > 0) {
    console.error(`::error::Failed to publish: ${failedProjects.join(", ")}`);
  }

  // ── Phase 2: resolve package metadata for all attempted projects ───────────
  // Use all projects from publishResults, not just the successful ones.
  // A non-zero exit code from npm publish can mean "already published" — the
  // npm registry is the authoritative source, checked below.
  const allAttemptedProjects = Object.keys(publishResults);
  const packagesByProject = new Map(
    (
      await Promise.all(
        allAttemptedProjects.map(async (project) => ({
          info: await getPackageInfo(project),
          project,
        })),
      )
    )
      .filter(
        (entry): entry is { info: PackageInfo; project: string } =>
          entry.info !== null,
      )
      .map(({ info, project }) => [project, info] as const),
  );
  const packages = [...packagesByProject.values()];

  // ── Phase 3: determine which packages should receive a tag ──────────────────
  //
  // Public packages:  npm registry is the source of truth — the package must
  //                   be present on npm before we create a tag.  This makes the
  //                   step idempotent across retries.
  // Private packages: they are never published to npm, so we rely on
  //                   `releasePublish` returning code 0 (Nx marks them as
  //                   successfully "processed" even though no upload happens).
  const publishedPackages = (
    await Promise.all(
      packages.map(async (pkg) => {
        if (pkg.private) {
          // For private packages Nx still calls the publish target (e.g. a
          // local build step) and returns code 0 on success.
          const project = [...packagesByProject.entries()].find(
            ([, info]) => info.name === pkg.name,
          )?.[0];
          const succeeded =
            project !== undefined && publishResults[project]?.code === 0;
          if (!succeeded) {
            console.log(
              `::notice::Private package ${pkg.name}@${pkg.version} was not successfully processed, skipping tag.`,
            );
          }
          return succeeded ? pkg : null;
        }

        // Public package — check the registry.
        const onNpm = await isPublishedOnNpm(pkg.name, pkg.version);
        if (!onNpm) {
          console.log(
            `::warning::${pkg.name}@${pkg.version} not found on npm, skipping tag.`,
          );
        }
        return onNpm ? pkg : null;
      }),
    )
  ).filter((p): p is PackageInfo => p !== null);

  // ── Phase 4: create git tags for published-but-untagged packages ───────────
  const createdTags: string[] = [];

  for (const pkg of publishedPackages) {
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

  // ── Phase 5: push tags + create GitHub releases ────────────────────────────
  if (createdTags.length > 0) {
    console.log(`::notice::Pushing ${createdTags.length} tags to origin`);
    await spawnInherit("git", ["push", "origin", "--tags"]);

    for (const pkg of publishedPackages) {
      const tagName = `${pkg.name}@${pkg.version}`;
      if (!createdTags.includes(tagName)) {
        continue;
      }
      const notes = await extractReleaseNotes(pkg);
      const prerelease = pkg.version.includes("-");
      await createGitHubRelease(tagName, notes, prerelease);
    }
  }

  // ── Phase 6: write outputs ─────────────────────────────────────────────────
  if (outputPath) {
    await appendOutput(
      outputPath,
      "published",
      publishedPackages.length > 0 ? "true" : "false",
    );
    await appendOutput(outputPath, "tags", createdTags.join(" "));
  }

  // Fail the action only when a package truly could not be published:
  //   - Public package:  failed AND still absent from npm registry
  //   - Private package: failed (no npm fallback check possible)
  const trulyFailed = await Promise.all(
    failedProjects.map(async (project) => {
      const pkg = packagesByProject.get(project);
      if (!pkg) return true;
      if (pkg.private) return true; // private publish failure is always real
      const onNpm = await isPublishedOnNpm(pkg.name, pkg.version);
      return !onNpm;
    }),
  );

  if (trulyFailed.some(Boolean)) {
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
