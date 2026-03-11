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
async function buildTagEntries(newTags) {
  const manifestInfos = await getModifiedManifestInfos();
  return newTags.map((tag) => {
    const match = manifestInfos.find(({ name, version: version2 }) => {
      if (!tag.endsWith(version2)) return false;
      const nameIdx = tag.indexOf(name);
      if (nameIdx === -1) return false;
      const charAfterName = tag[nameIdx + name.length];
      return charAfterName !== void 0 && !/\w/.test(charAfterName);
    });
    const version = match?.version ?? tag.slice(tag.lastIndexOf("@") + 1);
    return { path: match?.path ?? null, tag, version };
  });
}
async function getModifiedManifestInfos() {
  const { stdout } = await execFileAsync("git", [
    "diff",
    "--name-only",
    "--",
    "**/package.json",
    "**/pom.xml"
  ]);
  const infos = [];
  for (const f of stdout.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const result = f.endsWith("package.json") ? await readPackageJson(f) : await readPomXml(f);
    if (result?.name && result?.version) {
      infos.push({ name: result.name, path: f, version: result.version });
    }
  }
  return infos;
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

export { buildTagEntries, getModifiedManifestInfos };
