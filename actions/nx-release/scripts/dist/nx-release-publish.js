import { execFile, spawn } from 'child_process';
import { readFile, appendFile } from 'fs/promises';
import { join, dirname } from 'path';
import { promisify } from 'util';

// scripts/nx-release-publish.ts
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
async function extractReleaseNotes(target) {
  const changelog = join(dirname(target.sourceFile), "CHANGELOG.md");
  try {
    const lines = (await readFile(changelog, "utf8")).split("\n");
    const versionPattern = new RegExp(
      `^##\\s+\\[?${target.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
    );
    const start = lines.findIndex((line) => versionPattern.test(line));
    if (start === -1) {
      return `Release ${target.name}@${target.version}`;
    }
    const nextHeading = lines.findIndex(
      (line, i) => i > start && /^##\s+/.test(line)
    );
    const end = nextHeading === -1 ? lines.length : nextHeading;
    const section = lines.slice(start, end).join("\n").trim();
    return section || `Release ${target.name}@${target.version}`;
  } catch (err) {
    console.warn(`Could not read changelog for ${target.name}:`, err);
    return `Release ${target.name}@${target.version}`;
  }
}
async function extractTargets(manifestFiles) {
  const seen = /* @__PURE__ */ new Set();
  const targets = [];
  for (const file of manifestFiles) {
    if (file === "actions/nx-release/package.json") {
      continue;
    }
    const target = file.endsWith("package.json") ? await parsePackageJson(file) : null;
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
function isNpmRegistry(registry) {
  if (!registry) {
    return true;
  }
  const normalized = registry.replace(/\/+$/, "").toLowerCase();
  return normalized === "https://registry.npmjs.org" || normalized === "https://registry.yarnpkg.com";
}
async function listManifestFiles() {
  const { stdout } = await execFileAsync("git", [
    "ls-files",
    "--",
    "**/package.json"
  ]);
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}
async function parsePackageJson(path) {
  try {
    const raw = JSON.parse(await readFile(path, "utf8"));
    const name = typeof raw["name"] === "string" ? raw["name"] : null;
    const version = typeof raw["version"] === "string" ? raw["version"] : null;
    if (!name || !version) {
      return null;
    }
    const publishConfig = typeof raw["publishConfig"] === "object" && raw["publishConfig"] !== null ? raw["publishConfig"] : void 0;
    const registry = typeof publishConfig?.["registry"] === "string" ? publishConfig["registry"] : void 0;
    return {
      isPrivate: !!raw["private"] || !isNpmRegistry(registry),
      name,
      registry,
      sourceFile: path,
      version
    };
  } catch (err) {
    console.warn(`Failed to parse ${path}:`, err);
    return null;
  }
}
async function readNpmPublishedVersions(packageName, registry) {
  try {
    const args = ["view", packageName, "versions", "--json"];
    if (registry) {
      args.push("--registry", registry);
    }
    const { stdout } = await execFileAsync("npm", args);
    if (!stdout) {
      return [];
    }
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed.filter((v) => typeof v === "string");
    }
    return typeof parsed === "string" ? [parsed] : [];
  } catch (err) {
    console.warn(`Failed to read npm versions for ${packageName}:`, err);
    return [];
  }
}
async function run() {
  const outputPath = process.env.GITHUB_OUTPUT;
  const targets = await extractTargets(await listManifestFiles());
  const createdTags = [];
  for (const target of targets) {
    const tagName = `${target.name}@${target.version}`;
    if (await tagExists(tagName)) {
      console.log(`::notice::Tag ${tagName} already exists, skipping`);
      continue;
    }
    if (!await shouldCreateTag(target)) {
      console.log(
        `::notice::Skipping ${tagName}: version not confirmed on npm registry yet`
      );
      continue;
    }
    console.log(`::notice::Creating tag ${tagName}`);
    await spawnInherit("git", [
      "tag",
      "-a",
      tagName,
      "-m",
      `Release ${target.name} ${target.version}`
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
async function shouldCreateTag(target) {
  if (target.isPrivate) {
    return true;
  }
  const publishedVersions = await readNpmPublishedVersions(
    target.name,
    target.registry
  );
  return publishedVersions.includes(target.version);
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
  return await tagExistsLocally(tagName) || await tagExistsOnRemote(tagName);
}
async function tagExistsLocally(tagName) {
  try {
    await execFileAsync("git", [
      "rev-parse",
      "-q",
      "--verify",
      `refs/tags/${tagName}`
    ]);
    return true;
  } catch {
    return false;
  }
}
async function tagExistsOnRemote(tagName) {
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
