import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

type ReleaseTarget = {
  name: string;
  version: string;
  sourceFile: string;
  type: "npm" | "maven";
  isPrivate: boolean;
  registry?: string;
};

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `"'"'`)}'`;
}

function runCommand(command: string): string {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function listManifestFiles(): string[] {
  const output = runCommand("git ls-files -- '**/package.json' '**/pom.xml'");
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

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

function parsePackageJson(path: string): ReleaseTarget | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const pkg = JSON.parse(readFileSync(path, "utf8")) as {
      name?: string;
      version?: string;
      private?: boolean;
      publishConfig?: {
        registry?: string;
      };
    };

    if (!pkg.name || !pkg.version) {
      return null;
    }

    return {
      name: pkg.name,
      version: pkg.version,
      sourceFile: path,
      type: "npm",
      isPrivate: !!pkg.private || !isNpmRegistry(pkg.publishConfig?.registry),
      registry: pkg.publishConfig?.registry,
    };
  } catch {
    return null;
  }
}

function matchValue(content: string, regex: RegExp): string {
  return content.match(regex)?.[1]?.trim() ?? "";
}

function parsePom(path: string): ReleaseTarget | null {
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
    name,
    version,
    sourceFile: path,
    type: "maven",
    isPrivate: true,
  };
}

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

function tagExists(tagName: string): boolean {
  return tagExistsLocally(tagName) || tagExistsOnRemote(tagName);
}

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

    const parsed = JSON.parse(raw) as string | string[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === "string") {
      return [parsed];
    }

    return [];
  } catch {
    return [];
  }
}

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

function extractReleaseNotes(target: ReleaseTarget): string {
  const changelog = join(dirname(target.sourceFile), "CHANGELOG.md");
  if (!existsSync(changelog)) {
    return `Release ${target.name}@${target.version}`;
  }

  const lines = readFileSync(changelog, "utf8").split("\n");
  const versionPattern = new RegExp(
    `^##\\s+\\[?${target.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`,
  );

  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (versionPattern.test(lines[index])) {
      start = index;
      break;
    }
  }

  if (start === -1) {
    return `Release ${target.name}@${target.version}`;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }

  const section = lines.slice(start, end).join("\n").trim();
  return section || `Release ${target.name}@${target.version}`;
}

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

function appendOutput(key: string, value: string): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  execSync(
    `printf '%s=%s\n' ${shellEscape(key)} ${shellEscape(value)} >> ${shellEscape(outputPath)}`,
  );
}

function run(): void {
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

  appendOutput("tags", createdTags.join(" "));
}

run();
