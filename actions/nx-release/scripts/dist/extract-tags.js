import { execFile } from 'child_process';
import { promisify } from 'util';

// scripts/extract-tags.ts
var execFileAsync = promisify(execFile);
async function buildTagEntries(newTags) {
  const projectNames = await getNxProjectNames();
  const modifiedFiles = await getModifiedFiles();
  return Promise.all(
    newTags.map(async (tag) => {
      const name = matchProjectName(tag, projectNames);
      if (!name) {
        const m = tag.match(/[^\w](\d[\w.-]*)$/);
        const version2 = m ? m[1] : tag;
        return { path: null, tag, version: version2 };
      }
      const version = tag.slice(name.length + 1);
      const root = await getNxProjectRoot(name);
      const path = root ? modifiedFiles.find((f) => f.startsWith(root + "/")) ?? null : null;
      return { path, tag, version };
    })
  );
}
async function getModifiedFiles() {
  try {
    const { stdout } = await execFileAsync("git", [
      "diff",
      "HEAD",
      "--name-only"
    ]);
    return stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
async function getNxProjectNames() {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "projects",
      "--json"
    ]);
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string") ? parsed : [];
  } catch {
    return [];
  }
}
async function getNxProjectRoot(name) {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "project",
      name,
      "--json"
    ]);
    const parsed = JSON.parse(stdout);
    if (typeof parsed !== "object" || parsed === null) return null;
    const root = parsed["root"];
    return typeof root === "string" && root ? root : null;
  } catch {
    return null;
  }
}
function matchProjectName(tag, projectNames) {
  const candidates = projectNames.filter((name) => {
    if (!tag.startsWith(name)) return false;
    const charAfter = tag[name.length];
    return charAfter !== void 0 && !/\w/.test(charAfter);
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => a.length >= b.length ? a : b);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const newTags = (process.env.NEW_TAGS ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (newTags.length === 0) {
    console.log("[]");
  } else {
    buildTagEntries(newTags).then((entries) => console.log(JSON.stringify(entries))).catch((err) => {
      console.error("Unexpected error in extract-tags:", err);
      process.exit(1);
    });
  }
}

export { buildTagEntries, getModifiedFiles, getNxProjectNames, getNxProjectRoot, matchProjectName };
