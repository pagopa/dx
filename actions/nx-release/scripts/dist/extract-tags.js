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
    "diff",
    "--name-only",
    "--",
    "**/package.json",
    "**/pom.xml"
  ]);
  const modifiedManifests = stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  const manifestInfos = [];
  for (const f of modifiedManifests) {
    const result = f.endsWith("package.json") ? await readPackageJson(f) : await readPomXml(f);
    if (result?.name && result?.version) {
      manifestInfos.push({
        name: result.name,
        path: f,
        version: result.version
      });
    }
  }
  const entries = [];
  for (const tag of newTags) {
    const match = manifestInfos.find(
      ({ name, version }) => tag.includes(name) && tag.includes(version)
    );
    entries.push({ path: match?.path ?? null, tag });
  }
  console.log(JSON.stringify(entries));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("Unexpected error in extract-tags:", err);
    process.exit(1);
  });
}
