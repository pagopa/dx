import { execSync } from 'child_process';
import { existsSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';

// scripts/create-tags-releases.ts
function appendOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }
  appendFileSync(outputPath, `${key}=${value}
`);
}
function createGitHubRelease(tagName, notes, prerelease) {
  try {
    execSync(`gh release view ${shellEscape(tagName)}`, { stdio: "ignore" });
    console.log(`::notice::GitHub release ${tagName} already exists, skipping`);
    return;
  } catch {
  }
  const prereleaseFlag = prerelease ? "--prerelease" : "";
  const command = `gh release create ${shellEscape(tagName)} --title ${shellEscape(tagName)} --notes ${shellEscape(notes)} ${prereleaseFlag}`.trim();
  execSync(command, { stdio: "inherit" });
}
function extractReleaseNotes(target) {
  const changelog = join(dirname(target.sourceFile), "CHANGELOG.md");
  if (!existsSync(changelog)) {
    return `Release ${target.name}@${target.version}`;
  }
  const lines = readFileSync(changelog, "utf8").split("\n");
  const versionPattern = new RegExp(
    `^##\\s+\\[?${target.version.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`
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
function extractTargets(manifestFiles) {
  const seen = /* @__PURE__ */ new Set();
  const targets = [];
  for (const file of manifestFiles) {
    if (file === "actions/nx-release/package.json") {
      continue;
    }
    const target = file.endsWith("package.json") ? parsePackageJson(file) : file.endsWith("pom.xml") ? parsePom(file) : null;
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
function listManifestFiles() {
  const output = runCommand("git ls-files -- '**/package.json' '**/pom.xml'");
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}
function matchValue(content, regex) {
  return content.match(regex)?.[1]?.trim() ?? "";
}
function parsePackageJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    const pkg = JSON.parse(readFileSync(path, "utf8"));
    if (!pkg.name || !pkg.version) {
      return null;
    }
    return {
      isPrivate: !!pkg.private || !isNpmRegistry(pkg.publishConfig?.registry),
      name: pkg.name,
      registry: pkg.publishConfig?.registry,
      sourceFile: path,
      type: "npm",
      version: pkg.version
    };
  } catch {
    return null;
  }
}
function parsePom(path) {
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
    version
  };
}
function readNpmPublishedVersions(packageName, registry) {
  try {
    const registryArg = registry ? ` --registry ${shellEscape(registry)}` : "";
    const raw = runCommand(
      `npm view ${shellEscape(packageName)} versions --json${registryArg}`
    );
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
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
function run() {
  const targets = extractTargets(listManifestFiles());
  const createdTags = [];
  for (const target of targets) {
    const tagName = `${target.name}@${target.version}`;
    if (tagExists(tagName)) {
      console.log(`::notice::Tag ${tagName} already exists, skipping`);
      continue;
    }
    const shouldTag = shouldCreateTag(target);
    if (!shouldTag) {
      console.log(
        `::notice::Skipping ${tagName}: version not confirmed on npm registry yet`
      );
      continue;
    }
    console.log(`::notice::Creating tag ${tagName}`);
    execSync(
      `git tag -a ${shellEscape(tagName)} -m ${shellEscape(`Release ${target.name} ${target.version}`)}`,
      {
        stdio: "inherit"
      }
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
function runCommand(command) {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
function shellEscape(value) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
function shouldCreateTag(target) {
  if (target.type === "maven" || target.isPrivate) {
    return true;
  }
  const publishedVersions = readNpmPublishedVersions(
    target.name,
    target.registry
  );
  return publishedVersions.includes(target.version);
}
function tagExists(tagName) {
  return tagExistsLocally(tagName) || tagExistsOnRemote(tagName);
}
function tagExistsLocally(tagName) {
  try {
    execSync(`git rev-parse -q --verify refs/tags/${shellEscape(tagName)}`, {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
function tagExistsOnRemote(tagName) {
  try {
    const output = runCommand(
      `git ls-remote --tags origin refs/tags/${shellEscape(tagName)}`
    );
    return output.length > 0;
  } catch {
    return false;
  }
}
run();
