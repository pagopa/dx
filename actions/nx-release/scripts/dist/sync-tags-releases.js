import { execFile, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { promisify } from 'util';

// scripts/sync-tags-releases.ts
var execFileAsync = promisify(execFile);
function extractChangelogSection(clPath, version) {
  try {
    const lines = readFileSync(clPath, "utf8").split("\n");
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pat = new RegExp(`^##\\s+.*${escapedVersion}`);
    const s = lines.findIndex((l) => pat.test(l));
    if (s < 0) return null;
    const e = lines.findIndex((l, i) => i > s && /^##\s/.test(l));
    return lines.slice(s, e < 0 ? void 0 : e).join("\n").trim();
  } catch {
    return null;
  }
}
async function releaseExists(tag) {
  try {
    await execFileAsync("gh", ["release", "view", tag]);
    return true;
  } catch {
    return false;
  }
}
async function run() {
  const base = process.env.BASE_BRANCH ?? "main";
  const { stdout } = await execFileAsync("gh", [
    "pr",
    "list",
    "--state",
    "merged",
    "--head",
    "nx-release/main",
    "--base",
    base,
    "--limit",
    "100",
    "--json",
    "number,body"
  ]);
  const prs = JSON.parse(stdout);
  const allEntries = /* @__PURE__ */ new Map();
  for (const pr of prs) {
    if (!pr.body) continue;
    const m = pr.body.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
    if (!m) continue;
    try {
      for (const e of JSON.parse(m[1])) {
        allEntries.set(e.tag, e);
      }
    } catch {
    }
  }
  if (allEntries.size === 0) {
    console.log(
      "::notice::No release tags found in merged Version Packages PRs"
    );
    return;
  }
  const newTags = [];
  for (const entry of allEntries.values()) {
    if (await tagExistsOnRemote(entry.tag)) {
      console.log(`::notice::Tag ${entry.tag} already exists, skipping`);
      continue;
    }
    await spawnInherit("git", [
      "tag",
      "-a",
      entry.tag,
      "-m",
      `Release ${entry.tag}`
    ]);
    newTags.push(entry);
    console.log(`::notice::Created tag: ${entry.tag}`);
  }
  if (newTags.length === 0) {
    console.log("::notice::No new tags to push");
    return;
  }
  await spawnInherit("git", ["push", "origin", "--tags"]);
  for (const { path, tag } of newTags) {
    const version = tag.slice(tag.lastIndexOf("@") + 1);
    let notes = `Release ${tag}`;
    if (path) {
      const clPath = join(dirname(path), "CHANGELOG.md");
      if (existsSync(clPath)) {
        const section = extractChangelogSection(clPath, version);
        if (section) notes = section;
      }
    }
    if (await releaseExists(tag)) {
      console.log(`::notice::GitHub release ${tag} already exists, skipping`);
      continue;
    }
    const args = ["release", "create", tag, "--title", tag, "--notes", notes];
    if (version.includes("-")) args.push("--prerelease");
    await spawnInherit("gh", args);
    console.log(`::notice::Created GitHub release: ${tag}`);
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
async function tagExistsOnRemote(tag) {
  const { stdout } = await execFileAsync("git", [
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`
  ]);
  return stdout.trim().length > 0;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}
