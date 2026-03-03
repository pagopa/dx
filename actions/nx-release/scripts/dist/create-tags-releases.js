import { readPackageJson, readPomXml } from './chunk-A3PKVJUP.js';
import { execa } from './chunk-N4R2TMCK.js';
import { readFile, appendFile } from 'fs/promises';
import { join, dirname } from 'path';

async function appendOutput(outputPath, key, value) {
  await appendFile(outputPath, `${key}=${value}
`);
}
async function createGitHubRelease(tagName, notes, prerelease) {
  try {
    await execa("gh", ["release", "view", tagName], { stdio: "ignore" });
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
  await execa("gh", args, { stdio: "inherit" });
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
  } catch {
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
    const target = file.endsWith("package.json") ? await parsePackageJson(file) : file.endsWith("pom.xml") ? await parsePom(file) : null;
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
  const { stdout } = await execa("git", [
    "ls-files",
    "--",
    "**/package.json",
    "**/pom.xml"
  ]);
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}
async function parsePackageJson(path) {
  const result = await readPackageJson(path);
  if (!result) {
    return null;
  }
  const { name, raw, version } = result;
  const publishConfig = typeof raw["publishConfig"] === "object" && raw["publishConfig"] !== null ? raw["publishConfig"] : void 0;
  const registry = typeof publishConfig?.["registry"] === "string" ? publishConfig["registry"] : void 0;
  return {
    isPrivate: !!raw["private"] || !isNpmRegistry(registry),
    name,
    registry,
    sourceFile: path,
    type: "npm",
    version
  };
}
async function parsePom(path) {
  const result = await readPomXml(path);
  if (!result) {
    return null;
  }
  return {
    isPrivate: true,
    name: result.name,
    sourceFile: path,
    type: "maven",
    version: result.version
  };
}
async function readNpmPublishedVersions(packageName, registry) {
  try {
    const args = ["view", packageName, "versions", "--json"];
    if (registry) {
      args.push("--registry", registry);
    }
    const { stdout } = await execa("npm", args);
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
    await execa(
      "git",
      ["tag", "-a", tagName, "-m", `Release ${target.name} ${target.version}`],
      { stdio: "inherit" }
    );
    createdTags.push(tagName);
  }
  if (createdTags.length > 0) {
    console.log(`::notice::Pushing ${createdTags.length} tags to origin`);
    await execa("git", ["push", "origin", "--tags"], { stdio: "inherit" });
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
  if (target.type === "maven" || target.isPrivate) {
    return true;
  }
  const publishedVersions = await readNpmPublishedVersions(
    target.name,
    target.registry
  );
  return publishedVersions.includes(target.version);
}
async function tagExists(tagName) {
  return await tagExistsLocally(tagName) || await tagExistsOnRemote(tagName);
}
async function tagExistsLocally(tagName) {
  try {
    await execa(
      "git",
      ["rev-parse", "-q", "--verify", `refs/tags/${tagName}`],
      {
        stdio: "ignore"
      }
    );
    return true;
  } catch {
    return false;
  }
}
async function tagExistsOnRemote(tagName) {
  try {
    const { stdout } = await execa("git", [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tagName}`
    ]);
    return stdout.length > 0;
  } catch {
    return false;
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in create-tags-releases:", err);
    process.exit(1);
  });
}
