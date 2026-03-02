/**
 * Scans all tracked package manifests in the repo, creates annotated git tags
 * for newly published versions, pushes them to origin, and creates the
 * corresponding GitHub releases with changelog notes.
 */
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface ReleaseTarget {
  isPrivate: boolean;
  name: string;
  registry?: string;
  sourceFile: string;
  type: "maven" | "npm";
  version: string;
}

/** Writes an output key/value for downstream GitHub Action steps. */
function appendOutput(outputPath: string, key: string, value: string): void {
  appendFileSync(outputPath, `${key}=${value}\n`);
}

/** Creates a GitHub release for a tag if it does not already exist. */
function createGitHubRelease(
  tagName: string,
  notes: string,
  prerelease: boolean,
): void {
  try {
    execSync(`gh release view ${shellEscape(tagName)}`, { stdio: "ignore" });
    console.log(`::notice::GitHub release ${tagName} already exists, skipping`);
    return;
  } catch {
    // continue
  }

  const prereleaseFlag = prerelease ? "--prerelease" : "";
  const command =
    `gh release create ${shellEscape(tagName)} --title ${shellEscape(tagName)} --notes ${shellEscape(notes)} ${prereleaseFlag}`.trim();
  execSync(command, { stdio: "inherit" });
}

/** Extracts release notes for a specific version from package changelog. */
function extractReleaseNotes(target: ReleaseTarget): string {
  const changelog = join(dirname(target.sourceFile), "CHANGELOG.md");
  if (!existsSync(changelog)) {
    return `Release ${target.name}@${target.version}`;
  }

  const lines = readFileSync(changelog, "utf8").split("\n");
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
}

/** Builds the full list of release targets from repository manifests. */
function extractTargets(manifestFiles: string[]): ReleaseTarget[] {
  const seen = new Set<string>();
  const targets: ReleaseTarget[] = [];

  for (const file of manifestFiles) {
    if (file === "actions/nx-release/package.json") {
      continue;
    }

    const target = file.endsWith("package.json")
      ? parsePackageJson(file)
      : file.endsWith("pom.xml")
        ? parsePom(file)
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
function listManifestFiles(): string[] {
  const output = runCommand("git ls-files -- '**/package.json' '**/pom.xml'");
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Returns the first captured value for a regex match. */
function matchValue(content: string, regex: RegExp): string {
  return content.match(regex)?.[1]?.trim() ?? "";
}

/** Parses an npm package manifest into an internal release target model. */
function parsePackageJson(path: string): null | ReleaseTarget {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const pkg = parsed as Record<string, unknown>;
    if (typeof pkg["name"] !== "string" || typeof pkg["version"] !== "string") {
      return null;
    }
    const publishConfig =
      typeof pkg["publishConfig"] === "object" && pkg["publishConfig"] !== null
        ? (pkg["publishConfig"] as Record<string, unknown>)
        : undefined;
    const registry =
      typeof publishConfig?.["registry"] === "string"
        ? publishConfig["registry"]
        : undefined;

    return {
      isPrivate: !!pkg["private"] || !isNpmRegistry(registry),
      name: pkg["name"],
      registry,
      sourceFile: path,
      type: "npm",
      version: pkg["version"],
    };
  } catch {
    return null;
  }
}

/** Parses a Maven pom.xml into an internal release target model. */
function parsePom(path: string): null | ReleaseTarget {
  if (!existsSync(path)) {
    return null;
  }

  const raw = readFileSync(path, "utf8");
  const name = matchValue(raw, /<artifactId>([^<]+)<\/artifactId>/);
  const version = matchValue(raw, /<version>([^<]+)<\/version>/);
  if (!name || !version) {
    return null;
  }

  return {
    isPrivate: true,
    name,
    sourceFile: path,
    type: "maven",
    version,
  };
}

/** Reads all published versions for an npm package from the target registry. */
function readNpmPublishedVersions(
  packageName: string,
  registry?: string,
): string[] {
  try {
    const registryArg = registry ? ` --registry ${shellEscape(registry)}` : "";
    const raw = runCommand(
      `npm view ${shellEscape(packageName)} versions --json${registryArg}`,
    );

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
    return typeof parsed === "string" ? [parsed] : [];
  } catch {
    return [];
  }
}

/** Main entrypoint: resolves targets, creates missing tags, and syncs releases. */
function run(): void {
  const outputPath = process.env.GITHUB_OUTPUT;

  const targets = extractTargets(listManifestFiles());
  const createdTags: string[] = [];

  for (const target of targets) {
    const tagName = `${target.name}@${target.version}`;

    if (tagExists(tagName)) {
      console.log(`::notice::Tag ${tagName} already exists, skipping`);
      continue;
    }

    const shouldTag = shouldCreateTag(target);
    if (!shouldTag) {
      console.log(
        `::notice::Skipping ${tagName}: version not confirmed on npm registry yet`,
      );
      continue;
    }

    console.log(`::notice::Creating tag ${tagName}`);
    execSync(
      `git tag -a ${shellEscape(tagName)} -m ${shellEscape(`Release ${target.name} ${target.version}`)}`,
      {
        stdio: "inherit",
      },
    );

    createdTags.push(tagName);
  }

  if (createdTags.length > 0) {
    console.log(`::notice::Pushing ${createdTags.length} tags`);
    execSync("git push origin --tags", { stdio: "inherit" });

    for (const target of targets) {
      const tagName = `${target.name}@${target.version}`;
      if (!createdTags.includes(tagName)) {
        continue;
      }
      const notes = extractReleaseNotes(target);
      const prerelease = target.version.includes("-");
      createGitHubRelease(tagName, notes, prerelease);
    }
  }

  if (outputPath) {
    appendOutput(outputPath, "tags", createdTags.join(" "));
  }
}

/** Executes a command and returns trimmed stdout. */
function runCommand(command: string): string {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Escapes shell arguments to keep subprocess invocations safe. */
function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

/** Decides if a tag should be created for a target using registry-aware rules. */
function shouldCreateTag(target: ReleaseTarget): boolean {
  if (target.type === "maven" || target.isPrivate) {
    return true;
  }

  const publishedVersions = readNpmPublishedVersions(
    target.name,
    target.registry,
  );
  return publishedVersions.includes(target.version);
}

/** Checks whether a tag exists either locally or remotely. */
function tagExists(tagName: string): boolean {
  return tagExistsLocally(tagName) || tagExistsOnRemote(tagName);
}

/** Checks whether a tag exists in local git refs. */
function tagExistsLocally(tagName: string): boolean {
  try {
    execSync(`git rev-parse -q --verify refs/tags/${shellEscape(tagName)}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Checks whether a tag already exists on origin remote. */
function tagExistsOnRemote(tagName: string): boolean {
  try {
    const output = runCommand(
      `git ls-remote --tags origin refs/tags/${shellEscape(tagName)}`,
    );
    return output.length > 0;
  } catch {
    return false;
  }
}

run();
