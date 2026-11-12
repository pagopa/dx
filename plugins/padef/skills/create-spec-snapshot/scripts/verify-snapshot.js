// Checks a saved spec snapshot for local tampering and, given fresh responses, for staleness.
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { extractConfluenceLinks } from "./extract-confluence-links.js";
import {
  CHECKSUMS,
  ISSUE_FILE,
  lstatOrUndefined,
  pageFileName,
  readResponse,
  renderChecksums,
  renderSnapshot,
  resolveSnapshotPath,
  sha256,
} from "./save-snapshot.js";

const CHECKSUM_LINE = /^([0-9a-f]{64}) {2}([A-Za-z0-9][A-Za-z0-9._-]*)$/;

export class MissingSnapshotError extends Error {}
export class StaleSnapshotError extends Error {}
export class TamperedSnapshotError extends Error {}

function parseChecksums(content) {
  const listed = new Map();
  for (const line of content.split("\n").filter(Boolean)) {
    const match = line.match(CHECKSUM_LINE);
    if (!match || match[2] === CHECKSUMS || listed.has(match[2])) {
      throw new Error(`${CHECKSUMS} is malformed.`);
    }
    listed.set(match[2], match[1]);
  }
  return listed;
}

// Fails unless every file matches SHA256SUMS and the files match the linked pages.
export async function verifySnapshot(issueKey, pathOptions = {}) {
  const { directory } = resolveSnapshotPath(issueKey, pathOptions);
  const current = await lstatOrUndefined(directory);
  if (!current) {
    throw new MissingSnapshotError(`No snapshot at ${directory}.`);
  }
  try {
    if (!current.isDirectory()) {
      throw new Error(`${directory} is not a directory.`);
    }
    const listed = await checkFiles(directory);
    return { key: issueKey, directory, listed };
  } catch (error) {
    throw new TamperedSnapshotError(error.message, { cause: error });
  }
}

async function checkFiles(directory) {
  const listed = parseChecksums(
    await readFile(join(directory, CHECKSUMS), "utf8"),
  );
  for (const name of await readdir(directory)) {
    if (name !== CHECKSUMS && !listed.has(name)) {
      throw new Error(`${name} is not listed in ${CHECKSUMS}.`);
    }
  }
  for (const [name, hash] of listed) {
    const path = join(directory, name);
    if (!(await lstatOrUndefined(path))?.isFile()) {
      throw new Error(`${name} is missing or not a regular file.`);
    }
    if (sha256(await readFile(path)) !== hash) {
      throw new Error(`${name} does not match its checksum.`);
    }
  }

  const issue = JSON.parse(await readFile(join(directory, ISSUE_FILE), "utf8"));
  const expected = [
    ISSUE_FILE,
    ...extractConfluenceLinks(issue.fields?.description).pages.map(({ id }) =>
      pageFileName(id),
    ),
  ];
  if (!isDeepStrictEqual([...listed.keys()].sort(), expected.sort())) {
    throw new Error("Snapshot files do not match the linked Confluence pages.");
  }
  return listed;
}

// Verifies the snapshot, then compares its checksums with those of freshly rendered responses.
export async function checkFreshness(
  issueKey,
  response,
  { pages = [], ...pathOptions } = {},
) {
  const { files } = renderSnapshot(response, { expect: issueKey, pages });
  const { directory, listed } = await verifySnapshot(issueKey, pathOptions);
  const fresh = parseChecksums(renderChecksums(files));
  const changes = [...new Set([...listed.keys(), ...fresh.keys()])]
    .sort()
    .flatMap((name) => {
      if (!fresh.has(name)) {
        return [`${name} removed`];
      }
      if (!listed.has(name)) {
        return [`${name} added`];
      }
      return listed.get(name) === fresh.get(name) ? [] : [`${name} changed`];
    });
  if (changes.length > 0) {
    throw new StaleSnapshotError(`${directory}: ${changes.join(", ")}.`);
  }
  return { key: issueKey, directory };
}

const USAGE =
  "Usage: node verify-snapshot.js <issue-key> [<jira-response.json> [<confluence-response.json>...]]";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--help") {
    console.log(USAGE);
    return;
  }
  if (args.length === 0 || args.some((arg) => arg.startsWith("--"))) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const [rawKey, issuePath, ...pagePaths] = args;
  const key = rawKey.toUpperCase();
  try {
    if (issuePath === undefined) {
      const { directory } = await verifySnapshot(key);
      console.log(`Verified ${key} snapshot at ${directory}: not tampered.`);
      return;
    }
    const { directory } = await checkFreshness(
      key,
      await readResponse(issuePath),
      { pages: await Promise.all(pagePaths.map(readResponse)) },
    );
    console.log(
      `Verified ${key} snapshot at ${directory}: not tampered and up to date.`,
    );
  } catch (error) {
    for (const [type, label, code] of [
      [StaleSnapshotError, "stale", 2],
      [TamperedSnapshotError, "tampered", 3],
      [MissingSnapshotError, "missing", 4],
    ]) {
      if (error instanceof type) {
        console.error(`Snapshot ${label}: ${error.message}`);
        process.exitCode = code;
        return;
      }
    }
    console.error(`Snapshot not verified: ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
