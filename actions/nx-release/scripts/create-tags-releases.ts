/**
 * Scans all tracked package manifests in the repo, creates annotated git tags
 * for newly published versions, pushes them to origin, and creates the
 * corresponding GitHub releases with changelog notes.
 */
import { execFile, spawn } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { readPackageJson, readPomXml } from "./parse-manifests.js";

const execFileAsync = promisify(execFile);

interface ReleaseTarget {
  isPrivate: boolean;
  name: string;
  registry?: string;
  sourceFile: string;
  type: "maven" | "npm";
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

/** Extracts release notes for a specific version from package changelog. */
async function extractReleaseNotes(target: ReleaseTarget): Promise<string> {
  const changelog = join(dirname(target.sourceFile), "CHANGELOG.md");

  try {
    const lines = (await readFile(changelog, "utf8")).split("\n");
    const versionPattern = new RegExp(
      `^##\\s+\\[?${target.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`,
    );

    const start = lines.findIndex((line) => versionPattern.test(line));
    if (start === -1) {
      return `Release ${target.name}@${target.version}`;
    }

    const nextHeading = lines.findIndex(
      (line, i) => i > start && /^##\s+/.test(line),
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;

    const section = lines.slice(start, end).join("\n").trim();
    return section || `Release ${target.name}@${target.version}`;
  } catch (err) {
    console.warn(`Could not read changelog for ${target.name}:`, err);
    return `Release ${target.name}@${target.version}`;
  }
}

/** Builds the full list of release targets from repository manifests. */
async function extractTargets(
  manifestFiles: string[],
): Promise<ReleaseTarget[]> {
  const seen = new Set<string>();
  const targets: ReleaseTarget[] = [];

  for (const file of manifestFiles) {
    if (file === "actions/nx-release/package.json") {
      continue;
    }

    const target = file.endsWith("package.json")
      ? await parsePackageJson(file)
      : file.endsWith("pom.xml")
        ? await parsePom(file)
        : null;

    if (!target) {
      continue;
    }

    const key = `${target.name}@${target.version}@${target.sourceFile}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push(target);
  }

  return targets;
}

/** Checks whether a registry URL is npm-compatible (public npm/yarn mirrors). */
function isNpmRegistry(registry: string | undefined): boolean {
  if (!registry) {
    return true;
  }

  const normalized = registry.replace(/\/+$/, "").toLowerCase();
  return (
    normalized === "https://registry.npmjs.org" ||
    normalized === "https://registry.yarnpkg.com"
  );
}

/** Lists tracked manifest files (package.json and pom.xml) in the repo. */
async function listManifestFiles(): Promise<string[]> {
  const { stdout } = await execFileAsync("git", [
    "ls-files",
    "--",
    "**/package.json",
    "**/pom.xml",
  ]);
  return stdout
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
}

/** Parses an npm package manifest into an internal release target model. */
async function parsePackageJson(path: string): Promise<null | ReleaseTarget> {
  const result = await readPackageJson(path);
  if (!result) {
    return null;
  }

  const { name, raw, version } = result;
  const publishConfig =
    typeof raw["publishConfig"] === "object" && raw["publishConfig"] !== null
      ? (raw["publishConfig"] as Record<string, unknown>)
      : undefined;
  const registry =
    typeof publishConfig?.["registry"] === "string"
      ? publishConfig["registry"]
      : undefined;

  return {
    isPrivate: !!raw["private"] || !isNpmRegistry(registry),
    name,
    registry,
    sourceFile: path,
    type: "npm",
    version,
  };
}

/** Parses a Maven pom.xml into an internal release target model. */
async function parsePom(path: string): Promise<null | ReleaseTarget> {
  const result = await readPomXml(path);
  if (!result) {
    return null;
  }

  return {
    isPrivate: true,
    name: result.name,
    sourceFile: path,
    type: "maven",
    version: result.version,
  };
}

/** Reads all published versions for an npm package from the target registry. */
async function readNpmPublishedVersions(
  packageName: string,
  registry?: string,
): Promise<string[]> {
  try {
    const args = ["view", packageName, "versions", "--json"];
    if (registry) {
      args.push("--registry", registry);
    }
    const { stdout } = await execFileAsync("npm", args);
    if (!stdout) {
      return [];
    }
    const parsed: unknown = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
    return typeof parsed === "string" ? [parsed] : [];
  } catch (err) {
    console.warn(`Failed to read npm versions for ${packageName}:`, err);
    return [];
  }
}

/** Main entrypoint: resolves targets, creates missing tags, and syncs releases. */
async function run(): Promise<void> {
  const outputPath = process.env.GITHUB_OUTPUT;

  const targets = await extractTargets(await listManifestFiles());
  const createdTags: string[] = [];

  for (const target of targets) {
    const tagName = `${target.name}@${target.version}`;

    if (await tagExists(tagName)) {
      console.log(`::notice::Tag ${tagName} already exists, skipping`);
      continue;
    }

    if (!(await shouldCreateTag(target))) {
      console.log(
        `::notice::Skipping ${tagName}: version not confirmed on npm registry yet`,
      );
      continue;
    }

    console.log(`::notice::Creating tag ${tagName}`);
    await spawnInherit("git", [
      "tag",
      "-a",
      tagName,
      "-m",
      `Release ${target.name} ${target.version}`,
    ]);

    createdTags.push(tagName);
  }

  if (createdTags.length > 0) {
    console.log(`::notice::Pushing ${createdTags.length} tags to origin`);
    await spawnInherit("git", ["push", "origin", "--tags"]);

    for (const target of targets) {
      const tagName = `${target.name}@${target.version}`;
      if (!createdTags.includes(tagName)) {
        continue;
      }
      const notes = await extractReleaseNotes(target);
      const prerelease = target.version.includes("-");
      await createGitHubRelease(tagName, notes, prerelease);
    }
  }

  if (outputPath) {
    await appendOutput(outputPath, "tags", createdTags.join(" "));
  }
}

/** Decides if a tag should be created for a target using registry-aware rules. */
async function shouldCreateTag(target: ReleaseTarget): Promise<boolean> {
  if (target.type === "maven" || target.isPrivate) {
    return true;
  }

  const publishedVersions = await readNpmPublishedVersions(
    target.name,
    target.registry,
  );
  return publishedVersions.includes(target.version);
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

/** Checks whether a tag exists either locally or remotely. */
async function tagExists(tagName: string): Promise<boolean> {
  return (
    (await tagExistsLocally(tagName)) || (await tagExistsOnRemote(tagName))
  );
}

/** Checks whether a tag exists in local git refs. */
async function tagExistsLocally(tagName: string): Promise<boolean> {
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
    return false;
  }
}

/** Checks whether a tag already exists on origin remote. */
async function tagExistsOnRemote(tagName: string): Promise<boolean> {
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
    console.error("Unexpected error in create-tags-releases:", err);
    process.exit(1);
  });
}
