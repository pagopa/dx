/**
 * Reads a list of tags created by `nx release --skip-publish`, locates the
 * corresponding manifest file for each by inspecting working-tree changes, and
 * writes a JSON array of { path, tag, version } entries to stdout.
 *
 * Matching uses the bumped files from `git diff --name-only`, which is reliable
 * and independent of the releaseTagPattern separator configured in nx.json.
 *
 * Used to populate the nx-release-tags metadata comment in the Version Packages PR body.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { readPackageJson, readPomXml } from "./parse-manifests.js";

const execFileAsync = promisify(execFile);

export interface ManifestInfo {
  name: string;
  path: string;
  version: string;
}

export interface TagEntry {
  path: null | string;
  tag: string;
  version: string;
}

/**
 * Maps each Nx-generated tag to its manifest info.
 *
 * Matching rules (robust to any releaseTagPattern separator):
 * 1. The tag must end exactly with the bumped version string.
 * 2. The package name must appear in the tag followed by a non-word character
 *    (the separator), preventing partial matches like "foo" matching "foobar".
 */
export async function buildTagEntries(newTags: string[]): Promise<TagEntry[]> {
  const manifestInfos = await getModifiedManifestInfos();

  return newTags.map((tag) => {
    const match = manifestInfos.find(({ name, version }) => {
      if (!tag.endsWith(version)) return false;
      const nameIdx = tag.indexOf(name);
      if (nameIdx === -1) return false;
      const charAfterName = tag[nameIdx + name.length];
      return charAfterName !== undefined && !/\w/.test(charAfterName);
    });
    // Fall back to @-based extraction when manifest was not found (rare edge case).
    const version = match?.version ?? tag.slice(tag.lastIndexOf("@") + 1);
    return { path: match?.path ?? null, tag, version };
  });
}

/** Returns manifest metadata for all files modified by nx release in the working tree. */
export async function getModifiedManifestInfos(): Promise<ManifestInfo[]> {
  const { stdout } = await execFileAsync("git", [
    "diff",
    "--name-only",
    "--",
    "**/package.json",
    "**/pom.xml",
  ]);

  const infos: ManifestInfo[] = [];
  for (const f of stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)) {
    const result = f.endsWith("package.json")
      ? await readPackageJson(f)
      : await readPomXml(f);
    if (result?.name && result?.version) {
      infos.push({ name: result.name, path: f, version: result.version });
    }
  }
  return infos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const newTags = (process.env.NEW_TAGS ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (newTags.length === 0) {
    console.log("[]");
  } else {
    buildTagEntries(newTags)
      .then((entries) => console.log(JSON.stringify(entries)))
      .catch((err: unknown) => {
        console.error("Unexpected error in extract-tags:", err);
        process.exit(1);
      });
  }
}
