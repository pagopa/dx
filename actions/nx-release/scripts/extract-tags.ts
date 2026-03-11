/**
 * Reads the NEW_TAGS environment variable (newline-separated list of tags created
 * by `nx release --skip-publish`), locates the corresponding manifest file for each
 * tag by looking at files modified in the working tree (which are guaranteed to be
 * the manifests just bumped by nx release), and writes a JSON array of { path, tag }
 * entries to stdout.
 *
 * Matching is based on both the package name and bumped version appearing in the tag
 * string, without assuming any specific separator (the default "@" is configurable
 * in nx.json via `releaseTagPattern`).
 *
 * Used to populate the nx-release-tags metadata comment in the Version Packages PR body.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { readPackageJson, readPomXml } from "./parse-manifests.js";

const execFileAsync = promisify(execFile);

interface ManifestInfo {
  name: string;
  path: string;
  version: string;
}

interface TagEntry {
  path: null | string;
  tag: string;
}

async function run(): Promise<void> {
  const newTags = (process.env.NEW_TAGS ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (newTags.length === 0) {
    console.log("[]");
    return;
  }

  // Use files modified in the working tree by `nx release --skip-publish`.
  // These are guaranteed to be only the bumped manifests, making matching reliable
  // and independent of the tag format configured in nx.json.
  const { stdout } = await execFileAsync("git", [
    "diff",
    "--name-only",
    "--",
    "**/package.json",
    "**/pom.xml",
  ]);
  const modifiedManifests = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const manifestInfos: ManifestInfo[] = [];
  for (const f of modifiedManifests) {
    const result = f.endsWith("package.json")
      ? await readPackageJson(f)
      : await readPomXml(f);
    if (result?.name && result?.version) {
      manifestInfos.push({
        name: result.name,
        path: f,
        version: result.version,
      });
    }
  }

  const entries: TagEntry[] = [];
  for (const tag of newTags) {
    // Match by checking that:
    // 1. The tag ends exactly with the bumped version (prevents partial version matches).
    // 2. The package name appears in the tag followed immediately by a non-word
    //    character (the separator), so that "foo" doesn't accidentally match "foobar".
    // Both rules together are robust to any releaseTagPattern and to multiple packages
    // being bumped to the same version in the same PR.
    const match = manifestInfos.find(({ name, version }) => {
      if (!tag.endsWith(version)) return false;
      const nameIdx = tag.indexOf(name);
      if (nameIdx === -1) return false;
      const charAfterName = tag[nameIdx + name.length];
      return charAfterName !== undefined && !/\w/.test(charAfterName);
    });
    entries.push({ path: match?.path ?? null, tag });
  }

  console.log(JSON.stringify(entries));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err: unknown) => {
    console.error("Unexpected error in extract-tags:", err);
    process.exit(1);
  });
}
