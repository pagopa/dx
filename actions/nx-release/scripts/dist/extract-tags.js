import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

// scripts/extract-tags.ts
async function readPackageJson(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const pkg = parsed;
    if (typeof pkg["name"] !== "string" || typeof pkg["version"] !== "string") {
      return null;
    }
    return { name: pkg["name"], raw: pkg, version: pkg["version"] };
  } catch {
    return null;
  }
}
async function readPomXml(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    const name = raw.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]?.trim() ?? "";
    const version = raw.match(/<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "";
    if (!name || !version) {
      return null;
    }
    return { name, version };
  } catch {
    return null;
  }
}

// scripts/extract-tags.ts
var execFileAsync = promisify(execFile);
async function run() {
  const newTags = (process.env.NEW_TAGS ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (newTags.length === 0) {
    console.log("[]");
    return;
  }
  const { stdout } = await execFileAsync("git", [
    "ls-files",
    "--",
    "**/package.json",
    "**/pom.xml"
  ]);
  const manifests = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries = [];
  for (const tag of newTags) {
    const atIdx = tag.lastIndexOf("@");
    const name = tag.slice(0, atIdx);
    const version = tag.slice(atIdx + 1);
    let found = null;
    for (const f of manifests) {
      if (f.endsWith("package.json")) {
        const result = await readPackageJson(f);
        if (result?.name === name && result?.version === version) {
          found = f;
          break;
        }
      } else if (f.endsWith("pom.xml")) {
        const result = await readPomXml(f);
        if (result?.name === name && result?.version === version) {
          found = f;
          break;
        }
      }
    }
    entries.push({ path: found, tag });
  }
  console.log(JSON.stringify(entries));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in extract-tags:", err);
    process.exit(1);
  });
}
