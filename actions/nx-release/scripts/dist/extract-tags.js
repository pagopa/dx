import { execFile } from 'child_process';
import { promisify } from 'util';

// scripts/shared.ts
var execFileAsync = promisify(execFile);
async function getNxProjectNames() {
  try {
    const { stdout } = await execFileAsync("nx", [
      "show",
      "projects",
      "--json"
    ]);
    let jsonStart = stdout.indexOf('["');
    if (jsonStart === -1) jsonStart = stdout.indexOf("[]");
    if (jsonStart === -1) {
      console.error(
        "nx show projects: no JSON array found in stdout:",
        stdout.slice(0, 300)
      );
      return [];
    }
    const parsed = JSON.parse(stdout.slice(jsonStart));
    if (!Array.isArray(parsed)) return [];
    if (parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error("getNxProjectNames failed:", err);
    return [];
  }
}
async function getNxProjectRoot(name) {
  const metadata = await getNxProjectMetadata(name);
  if (!metadata) return null;
  const root = metadata["root"];
  return typeof root === "string" && root ? root : null;
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
async function getNxProjectMetadata(projectName) {
  try {
    const { stdout } = await execFileAsync("nx", [
      "show",
      "project",
      projectName,
      "--json"
    ]);
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      console.error(
        `nx show project ${projectName}: no JSON object found in stdout:`,
        stdout.slice(0, 200)
      );
      return null;
    }
    const parsed = JSON.parse(stdout.slice(jsonStart));
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (err) {
    console.error(`getNxProjectMetadata(${projectName}) failed:`, err);
    return null;
  }
}

// scripts/extract-tags.ts
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

export { buildTagEntries };
