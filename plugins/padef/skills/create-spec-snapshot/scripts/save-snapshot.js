// Filters a Jira issue and its linked Confluence pages, then atomically persists them as a spec snapshot.
import { createHash, randomBytes } from "node:crypto";
import {
  link,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import {
  extractConfluenceLinks,
  isObject,
  unwrapIssue,
} from "./extract-confluence-links.js";

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*-[1-9][0-9]*$/;

function pick(source, keys) {
  return Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(source, key))
      .map((key) => [key, source[key]]),
  );
}

function projectObject(source, key, keys) {
  if (!Object.hasOwn(source, key)) {
    return {};
  }
  const value = source[key];
  if (value === null) {
    return { [key]: null };
  }
  if (!isObject(value)) {
    throw new Error(`Jira issue ${key} must be an object or null.`);
  }
  return { [key]: pick(value, keys) };
}

export function filterIssue(issue) {
  if (!isObject(issue)) {
    throw new Error("Jira issue must be a JSON object.");
  }
  if (typeof issue.key !== "string" || !ISSUE_KEY_PATTERN.test(issue.key)) {
    throw new Error("Jira issue has no canonical issue key.");
  }
  if (!isObject(issue.fields) || !Object.hasOwn(issue.fields, "description")) {
    throw new Error("Jira issue has no fields.description.");
  }

  const parent = projectObject(issue.fields, "parent", ["id", "key"]);
  if (parent.parent && Object.hasOwn(issue.fields.parent, "fields")) {
    const parentFields = issue.fields.parent.fields;
    if (parentFields !== null && !isObject(parentFields)) {
      throw new Error("Jira issue parent.fields must be an object or null.");
    }
    parent.parent.fields =
      parentFields === null ? null : pick(parentFields, ["summary"]);
  }

  return {
    ...pick(issue, ["id", "key"]),
    fields: {
      ...parent,
      ...projectObject(issue.fields, "issuetype", ["id", "name", "subtask"]),
      ...projectObject(issue.fields, "project", ["id", "key", "name"]),
      ...pick(issue.fields, ["updated", "description", "summary"]),
    },
  };
}

export const CHECKSUMS = "SHA256SUMS";
export const ISSUE_FILE = "issue.json";
const CURRENT = "CURRENT";
const GENERATIONS = "generations";
const GENERATION_PATTERN = /^[0-9a-f]{12}$/;

export const pageFileName = (id) => `confluence-${id}.md`;

function unwrapPage(response) {
  if (!isObject(response)) {
    throw new Error("Confluence response must be a JSON object.");
  }
  if (response.isError === true || Object.hasOwn(response, "error")) {
    const detail = JSON.stringify(response.error ?? response.content ?? null);
    throw new Error(`Confluence response is an error, not a page: ${detail}`);
  }
  if (!Object.hasOwn(response, "id") && isObject(response.data)) {
    return response.data;
  }
  return response;
}

function renderPage(page, url) {
  if (typeof page.title !== "string") {
    throw new Error(`Confluence page ${page.id} has no title.`);
  }
  if (
    !isObject(page.body) ||
    page.body.format !== "markdown" ||
    typeof page.body.value !== "string"
  ) {
    throw new Error(`Confluence page ${page.id} has no Markdown body.`);
  }
  const version = page.metadata?.version?.number;
  const frontMatter = [
    "---",
    `id: ${JSON.stringify(page.id)}`,
    `title: ${JSON.stringify(page.title)}`,
    ...(Number.isInteger(version) ? [`version: ${version}`] : []),
    `url: ${JSON.stringify(url)}`,
    "---",
    "",
  ].join("\n");
  const body = page.body.value.endsWith("\n")
    ? page.body.value
    : `${page.body.value}\n`;
  return `${frontMatter}\n${body}`;
}

// Matches fetched pages to the linked pages exactly and renders them as Markdown files.
export function renderLinkedPages(description, responses) {
  const { pages: links, unresolved } = extractConfluenceLinks(description);
  const fetched = new Map();
  for (const response of responses) {
    const page = unwrapPage(response);
    if (typeof page.id !== "string" || !/^\d+$/.test(page.id)) {
      throw new Error("Confluence page has no numeric id.");
    }
    if (fetched.has(page.id)) {
      throw new Error(`Confluence page ${page.id} was supplied twice.`);
    }
    fetched.set(page.id, page);
  }
  const files = {};
  for (const { id, url } of links) {
    if (!fetched.has(id)) {
      throw new Error(`Linked Confluence page ${id} was not supplied.`);
    }
    files[pageFileName(id)] = renderPage(fetched.get(id), url);
    fetched.delete(id);
  }
  if (fetched.size > 0) {
    throw new Error(
      `Confluence page ${[...fetched.keys()][0]} is not linked from the description.`,
    );
  }
  return { files, unresolved };
}

export function resolveSnapshotPath(
  issueKey,
  { homeDir = homedir(), xdgCacheHome = process.env.XDG_CACHE_HOME } = {},
) {
  if (typeof issueKey !== "string" || !ISSUE_KEY_PATTERN.test(issueKey)) {
    throw new Error("Issue key must be canonical, for example CES-123.");
  }
  const cacheHome = xdgCacheHome ? xdgCacheHome : join(homeDir, ".cache");
  if (!isAbsolute(cacheHome)) {
    throw new Error("XDG_CACHE_HOME must be an absolute path.");
  }
  return {
    cacheHome: resolve(cacheHome),
    directory: resolve(cacheHome, "padef", "snapshots", issueKey),
  };
}

export const sha256 = (content) =>
  createHash("sha256").update(content).digest("hex");

export async function lstatOrUndefined(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function refuseSymlink(path) {
  if ((await lstatOrUndefined(path))?.isSymbolicLink()) {
    throw new Error(`Refusing symlink in snapshot path: ${path}`);
  }
}

export async function resolveCurrentSnapshotDirectory(directory) {
  const snapshotDirectory = await lstatOrUndefined(directory);
  if (!snapshotDirectory) {
    return undefined;
  }
  if (!snapshotDirectory.isDirectory()) {
    throw new Error(`Snapshot path is not a directory: ${directory}`);
  }

  const generationsDirectory = join(directory, GENERATIONS);
  const generations = await lstatOrUndefined(generationsDirectory);
  if (generations && !generations.isDirectory()) {
    throw new Error(
      `Snapshot generations path is not a directory: ${generationsDirectory}`,
    );
  }

  const pointer = join(directory, CURRENT);
  const pointerStat = await lstatOrUndefined(pointer);
  if (!pointerStat) {
    return undefined;
  }
  if (!pointerStat.isFile()) {
    throw new Error(`Snapshot pointer is not a regular file: ${pointer}`);
  }

  const generation = (await readFile(pointer, "utf8")).trim();
  if (!GENERATION_PATTERN.test(generation)) {
    throw new Error(`Snapshot pointer is malformed: ${pointer}`);
  }

  const generationDirectory = join(generationsDirectory, generation);
  const generationStat = await lstatOrUndefined(generationDirectory);
  if (!generationStat?.isDirectory()) {
    throw new Error(
      `Snapshot generation is missing or not a directory: ${generationDirectory}`,
    );
  }
  return generationDirectory;
}

export function renderChecksums(files) {
  return Object.keys(files)
    .sort()
    .map((name) => `${sha256(files[name])}  ${name}\n`)
    .join("");
}

// Renders the files a snapshot holds, keyed by file name, without touching disk.
export function renderSnapshot(response, { expect, pages = [] } = {}) {
  const snapshot = filterIssue(unwrapIssue(response));
  if (
    expect !== undefined &&
    expect !== snapshot.key &&
    expect !== snapshot.id
  ) {
    throw new Error(
      `Jira returned ${snapshot.key}, which does not match the requested ${expect}.`,
    );
  }
  const issueContent = `${JSON.stringify(snapshot, null, 2)}\n`;
  const { files: pageFiles, unresolved } = renderLinkedPages(
    snapshot.fields.description,
    pages,
  );
  const files = { [ISSUE_FILE]: issueContent, ...pageFiles };
  return {
    key: snapshot.key,
    snapshot,
    files,
    pages: Object.keys(pageFiles),
    unresolved,
  };
}

export async function saveSnapshot(
  response,
  { expect, pages = [], replace = false, ...pathOptions } = {},
) {
  const {
    snapshot,
    files,
    pages: pageFiles,
    unresolved,
  } = renderSnapshot(response, { expect, pages });
  const { cacheHome, directory } = resolveSnapshotPath(
    snapshot.key,
    pathOptions,
  );
  const snapshots = join(cacheHome, "padef", "snapshots");
  for (const segment of [join(cacheHome, "padef"), snapshots, directory]) {
    await refuseSymlink(segment);
  }
  await mkdir(snapshots, { recursive: true, mode: 0o700 });
  const existingDirectory = await lstatOrUndefined(directory);
  if (existingDirectory && !existingDirectory.isDirectory()) {
    throw new Error(`Snapshot path is not a directory: ${directory}`);
  }
  if (!existingDirectory) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }
  await refuseSymlink(directory);

  const currentDirectory = await resolveCurrentSnapshotDirectory(directory);
  if (currentDirectory && !replace) {
    throw new Error(
      `A snapshot already exists at ${directory}; pass --replace to overwrite it.`,
    );
  }

  const generationsDirectory = join(directory, GENERATIONS);
  await mkdir(generationsDirectory, { recursive: true, mode: 0o700 });
  await refuseSymlink(generationsDirectory);

  const generation = randomBytes(6).toString("hex");
  const generationDirectory = join(generationsDirectory, generation);
  const staging = join(generationsDirectory, `.${generation}.tmp`);
  const pointer = join(directory, CURRENT);
  const stagedPointer = join(directory, `.${CURRENT}.${generation}.tmp`);
  let published = false;
  try {
    await mkdir(staging, { mode: 0o700 });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(staging, name), content, {
        flag: "wx",
        mode: 0o444,
      });
    }
    const written = JSON.parse(
      await readFile(join(staging, ISSUE_FILE), "utf8"),
    );
    if (!isDeepStrictEqual(written, snapshot)) {
      throw new Error("Written snapshot does not match the filtered issue.");
    }
    await writeFile(join(staging, CHECKSUMS), renderChecksums(files), {
      flag: "wx",
      mode: 0o444,
    });

    await rename(staging, generationDirectory);
    await writeFile(stagedPointer, `${generation}\n`, {
      flag: "wx",
      mode: 0o444,
    });

    const latestPointer = await lstatOrUndefined(pointer);
    if (latestPointer) {
      if (!latestPointer.isFile()) {
        throw new Error(`Snapshot pointer is not a regular file: ${pointer}`);
      }
      if (!replace && !currentDirectory) {
        throw new Error(
          `A snapshot already exists at ${directory}; pass --replace to overwrite it.`,
        );
      }
      await rename(stagedPointer, pointer);
    } else {
      try {
        // Linking publishes the first pointer atomically without replacing a concurrent save.
        await link(stagedPointer, pointer);
      } catch (error) {
        if (error.code !== "EEXIST" || !replace) {
          if (error.code === "EEXIST") {
            throw new Error(
              `A snapshot already exists at ${directory}; pass --replace to overwrite it.`,
              { cause: error },
            );
          }
          throw error;
        }
        await rename(stagedPointer, pointer);
      }
    }
    published = true;
    await rm(stagedPointer, { force: true });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    await rm(stagedPointer, { force: true });
    if (!published) {
      await rm(generationDirectory, { recursive: true, force: true });
    }
    throw error;
  }
  return {
    key: snapshot.key,
    directory: generationDirectory,
    pages: pageFiles,
    unresolved,
  };
}

const USAGE = [
  "Usage: node save-snapshot.js [--expect <key-or-id>] [--replace] <jira-response.json> [<confluence-response.json>...]",
].join("\n");

export const readResponse = async (path) =>
  JSON.parse(await readFile(path, "utf8"));

async function run(args) {
  let expect;
  let replace = false;
  for (;;) {
    if (args[0] === "--expect") {
      expect = args[1]?.toUpperCase();
      args = args.slice(2);
    } else if (args[0] === "--replace") {
      replace = true;
      args = args.slice(1);
    } else {
      break;
    }
  }
  if (args.length === 0 || args.some((arg) => arg.startsWith("--"))) {
    throw new Error(USAGE);
  }
  const [issuePath, ...pagePaths] = args;
  const { key, directory, pages, unresolved } = await saveSnapshot(
    await readResponse(issuePath),
    {
      expect,
      replace,
      pages: await Promise.all(pagePaths.map(readResponse)),
    },
  );
  return [
    `Saved ${key} snapshot with ${pages.length} Confluence page(s) to ${directory}`,
    ...unresolved.map(
      (url) => `Skipped Confluence link without a page ID: ${url}`,
    ),
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(USAGE);
    return;
  }
  try {
    console.log(await run(args));
  } catch (error) {
    console.error(`Snapshot not saved: ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
