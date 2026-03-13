import { execFile, spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { promisify } from 'util';

// scripts/sync-tags-releases.ts
var execFileAsync = promisify(execFile);
async function extractChangelogSection(clPath, version) {
  try {
    const lines = (await readFile(clPath, "utf8")).split("\n");
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
async function run(base) {
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
    // Scanning the last 20 merged PRs is enough to recover from any realistic
    // sequence of failed publish runs without making the step noticeably slow.
    "20",
    "--json",
    "number,body"
  ]);
  const parsed = JSON.parse(stdout);
  if (!isPrDataArray(parsed)) {
    throw new Error("Unexpected gh pr list response: not an array of PR data");
  }
  const allEntries = /* @__PURE__ */ new Map();
  for (const pr of parsed) {
    if (!pr.body) continue;
    const m = pr.body.match(/<!-- nx-release-tags: (\[[\s\S]*?\]) -->/);
    if (!m) continue;
    for (const e of parseTagEntries(JSON.parse(m[1]))) {
      allEntries.set(e.tag, e);
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
  for (const { path, tag, version } of newTags) {
    let notes = `Release ${tag}`;
    if (path) {
      const clPath = join(dirname(path), "CHANGELOG.md");
      const section = await extractChangelogSection(clPath, version);
      if (section) notes = section;
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
function isPrDataArray(value) {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "object" && item !== null && typeof item["body"] === "string" && typeof item["number"] === "number"
  );
}
function parseTagEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const r = item;
    if (typeof r["tag"] !== "string") return [];
    return [
      {
        path: typeof r["path"] === "string" ? r["path"] : null,
        tag: r["tag"],
        version: typeof r["version"] === "string" ? r["version"] : ""
      }
    ];
  });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.env.BASE_BRANCH ?? "main").catch((err) => {
    console.error("Unexpected error in sync-tags-releases:", err);
    process.exit(1);
  });
}

export { extractChangelogSection, releaseExists, run, spawnInherit, tagExistsOnRemote };
