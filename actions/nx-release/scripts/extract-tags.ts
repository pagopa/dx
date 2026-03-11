/**
 * Reads the NEW_TAGS environment variable (newline-separated list of tags created
 * by `nx release --skip-publish`), locates the corresponding manifest file for each
 * tag in the repository, and writes a JSON array of { tag, path } entries to stdout.
 * Used to populate the nx-release-tags metadata comment in the Version Packages PR body.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { readPackageJson, readPomXml } from "./parse-manifests.js";

const execFileAsync = promisify(execFile);

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

  const { stdout } = await execFileAsync("git", [
    "ls-files",
    "--",
    "**/package.json",
    "**/pom.xml",
  ]);
  const manifests = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const entries: TagEntry[] = [];

  for (const tag of newTags) {
    const atIdx = tag.lastIndexOf("@");
    const name = tag.slice(0, atIdx);
    const version = tag.slice(atIdx + 1);
    let found: null | string = null;

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
  run().catch((err: unknown) => {
    console.error("Unexpected error in extract-tags:", err);
    process.exit(1);
  });
}
