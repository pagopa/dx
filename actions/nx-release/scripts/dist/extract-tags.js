import { execFile } from 'child_process';
import { promisify } from 'util';

// scripts/extract-tags.ts
var execFileAsync = promisify(execFile);
async function buildTagEntries(newTags) {
  const projectNames = await getNxProjectNames();
  return Promise.all(
    newTags.map(async (tag) => {
      const name = matchProjectName(tag, projectNames);
      if (!name) {
        const m = tag.match(/[^\w](\d[\w.-]*)$/);
        const version2 = m ? m[1] : tag;
        return { path: null, tag, version: version2 };
      }
      const version = tag.slice(name.length + 1);
      const path = await getNxProjectRoot(name);
      return { path, tag, version };
    })
  );
}
async function getNxProjectNames() {
  try {
    const { stdout } = await execFileAsync("npx", [
      "nx",
      "show",
      "projects",
      "--json"
    ]);
    let jsonStart = stdout.indexOf('["');
    if (jsonStart === -1) jsonStart = stdout.indexOf("[]");
    if (jsonStart === -1) {
      console.error(
        "[extract-tags] nx show projects: no JSON array found in stdout:",
        stdout.slice(0, 300)
      );
      return [];
    }
    const parsed = JSON.parse(stdout.slice(jsonStart));
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string") ? parsed : [];
  } catch (err) {
    console.error("[extract-tags] getNxProjectNames failed:", err);
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
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      console.error(
        `[extract-tags] nx show project ${name}: no JSON object found in stdout:`,
        stdout.slice(0, 200)
      );
      return null;
    }
    const parsed = JSON.parse(stdout.slice(jsonStart));
    if (typeof parsed !== "object" || parsed === null) return null;
    const root = parsed["root"];
    return typeof root === "string" && root ? root : null;
  } catch (err) {
    console.error(`[extract-tags] getNxProjectRoot(${name}) failed:`, err);
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

export { buildTagEntries, getNxProjectNames, getNxProjectRoot, matchProjectName };
