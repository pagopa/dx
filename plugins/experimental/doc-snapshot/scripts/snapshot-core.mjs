// Capture an immutable input bundle; transport and CLI configuration live separately.
import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { z } from "zod";

const ticketSchema = z.string().regex(/^[A-Z][A-Z0-9_]*-[1-9]\d*$/);
const handoffSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/);
const issueSchema = z.object({
  key: ticketSchema,
  fields: z.object({
    summary: z.string(),
    description: z.string().nullable(),
    updated: z.string(),
  }),
});
const pageSchema = z.object({
  id: z.string().regex(/^\d+$/),
  title: z.string(),
  type: z.literal("page"),
  status: z.literal("current"),
  body: z.object({ format: z.literal("html"), value: z.string() }),
  metadata: z.object({ version: z.object({ number: z.number().int().positive() }) }),
});
const remoteLinksSchema = z.array(z.object({
  object: z.object({ url: z.string().url() }),
}));
const artifactSchema = z.object({
  file: z.string().regex(/^[a-zA-Z0-9_-]+\.(json|md|html)$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  site: z.string().url(),
  ticket: ticketSchema,
  handoff: handoffSchema,
  createdAt: z.string(),
  sources: z.array(z.object({
    kind: z.enum(["confluence", "local"]),
    locator: z.string(),
    artifacts: z.array(artifactSchema).min(1),
  }).passthrough()).min(1),
  artifacts: z.array(artifactSchema).min(1),
});

export function validated(schema, value, label) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`${label}: ${parsed.error.message}`);
  return parsed.data;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function markdown(html) {
  const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  converter.use(gfm);
  return converter.turndown(html) + "\n";
}

export function discoverSources(description, remoteLinks, site) {
  const text = /<\/?[a-z][\s\S]*>/i.test(description) ? markdown(description) : description;
  const urls = [
    ...remoteLinks.map((link) => link.object.url),
    ...Array.from(text.matchAll(/https:\/\/[^\s<>"`)\]]+/g), (match) => match[0]),
  ];
  const confluence = [...new Set(urls.flatMap((value) => {
    const url = new URL(value);
    if (url.origin !== site || !url.pathname.startsWith("/wiki/")) return [];
    if (!/\/(?:pages\/\d+|x\/[a-zA-Z0-9_-]+)|\/viewpage\.action$/.test(url.pathname)) {
      throw new Error(`Unsupported Confluence source URL: ${value}`);
    }
    return [url.origin + url.pathname + url.search];
  }))].sort();
  const sourceLines = [...text.matchAll(/(?:^|\s)Source documents?:\s*(.+)$/gim)];
  const local = [...new Set(sourceLines.flatMap((match) =>
    Array.from(match[1].matchAll(/`([^`]+)`/g), (value) => value[1])
      .filter((value) => !value.includes("://")),
  ))].sort();
  return { confluence, local };
}

export function snapshotPath({ root, site, ticket, handoff }) {
  validated(ticketSchema, ticket, "Ticket");
  validated(handoffSchema, handoff, "Handoff");
  const origin = new URL(site).origin;
  if (new URL(origin).protocol !== "https:") throw new Error("Atlassian site must use HTTPS");
  return join(resolve(root), sha256(origin).slice(0, 16), ticket, handoff);
}

export async function verifySnapshot(folder, expected) {
  const canonicalFolder = await realpath(folder);
  const manifestInfo = await lstat(join(folder, "manifest.json"));
  if (!manifestInfo.isFile() || manifestInfo.mode & 0o222) {
    throw new Error("Manifest must be a read-only regular file");
  }
  const manifest = validated(
    manifestSchema, JSON.parse(await readFile(join(folder, "manifest.json"), "utf8")), "Manifest",
  );
  if (expected && ["site", "ticket", "handoff"].some((key) => manifest[key] !== expected[key])) {
    throw new Error("Snapshot identity mismatch");
  }
  for (const artifact of [...manifest.artifacts, ...manifest.sources.flatMap((s) => s.artifacts)]) {
    const path = join(folder, artifact.file);
    if (await realpath(path) !== join(canonicalFolder, artifact.file)) {
      throw new Error(`Symlink in snapshot: ${artifact.file}`);
    }
    if (sha256(await readFile(path)) !== artifact.sha256) {
      throw new Error(`Snapshot integrity failure: ${artifact.file}`);
    }
    if ((await stat(path)).mode & 0o222) throw new Error(`Writable snapshot: ${artifact.file}`);
  }
  return manifest;
}

export async function existingSnapshot(options) {
  const folder = snapshotPath(options);
  try {
    await stat(folder);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  await verifySnapshot(folder, options);
  return folder;
}

export async function captureSnapshot(options, call) {
  const existing = await existingSnapshot(options);
  if (existing) return existing;
  const folder = snapshotPath(options);
  await mkdir(dirname(folder), { recursive: true, mode: 0o700 });
  const lock = `${folder}.lock`;
  await mkdir(lock, { mode: 0o700 });
  const staging = join(dirname(folder), `.staging-${randomUUID()}`);
  try {
    await mkdir(staging, { mode: 0o700 });
    const artifacts = [];
    const save = async (file, bytes) => {
      await writeFile(join(staging, file), bytes, { flag: "wx", mode: 0o400 });
      return { file, sha256: sha256(bytes) };
    };
    const saveJson = (file, value) => save(file, JSON.stringify(value, null, 2) + "\n");
    const rawIssue = await call("getJiraIssue", {
      cloudId: options.site, issueIdOrKey: options.ticket,
      fields: ["summary", "description", "updated"], responseContentFormat: "html",
    });
    const issue = validated(issueSchema, rawIssue, "Jira issue");
    if (issue.key !== options.ticket) throw new Error("Jira returned a different ticket");
    artifacts.push(await saveJson("jira.json", rawIssue));
    const description = issue.fields.description ?? "";
    artifacts.push(await save("jira.md", `# ${issue.key}: ${issue.fields.summary}\n\n${markdown(description)}`));
    const remoteLinks = validated(remoteLinksSchema, await call("executeRead", {
      cloudId: options.site, name: "listJiraIssueRemoteIssueLinks",
      inputs: { issueIdOrKey: options.ticket },
    }), "Jira remote links");
    artifacts.push(await saveJson("remote-links.json", remoteLinks));
    const discovered = discoverSources(description, remoteLinks, options.site);
    if (!discovered.confluence.length && !discovered.local.length) {
      throw new Error("No supported sources found; refusing an empty snapshot");
    }
    const sources = [];
    const pageIds = new Set();
    for (const locator of discovered.confluence) {
      const rawPage = await call("getConfluenceContent", {
        cloudId: options.site, content_url: locator, detail: "full", content_format: "html",
      });
      const page = validated(pageSchema, rawPage, "Confluence page");
      if (pageIds.has(page.id)) continue;
      pageIds.add(page.id);
      // Dynamic macro output is not pinned by a page's version number.
      if (/<(?:ac:structured-macro|ac:macro)|data-(?:macro|extension)|<iframe\b/i.test(page.body.value)) {
        throw new Error(`Page ${page.id} has unsupported dynamic content; completeness needs review`);
      }
      const prefix = `page-${page.id}-v${page.metadata.version.number}`;
      sources.push({
        kind: "confluence", locator, pageId: page.id,
        title: page.title, version: page.metadata.version.number,
        fetchedAt: new Date().toISOString(),
        artifacts: [
          await saveJson(`${prefix}.json`, rawPage),
          await save(`${prefix}.html`, page.body.value),
          await save(`${prefix}.md`, markdown(page.body.value)),
        ],
      });
    }
    for (const locator of discovered.local) {
      if (isAbsolute(locator)) throw new Error(`Absolute local source forbidden: ${locator}`);
      const root = await realpath(options.repoRoot);
      const path = await realpath(resolve(root, locator));
      const inside = relative(root, path);
      if (inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
        throw new Error(`Local source escapes repository: ${locator}`);
      }
      if (!locator.endsWith(".md")) throw new Error(`Only local Markdown is supported: ${locator}`);
      sources.push({
        kind: "local", locator, fetchedAt: new Date().toISOString(),
        artifacts: [await save(`local-${sha256(locator).slice(0, 16)}.md`, await readFile(path))],
      });
    }
    const manifest = {
      schemaVersion: 1, site: options.site, ticket: options.ticket,
      handoff: options.handoff, createdAt: new Date().toISOString(),
      selectionPolicy: "remote-links plus legacy description Confluence URLs and Source documents code paths",
      jiraUpdated: issue.fields.updated,
      limitations: [
        "Discovery prototype, not a ready-for-code result or authorization to implement.",
        "Markdown is a derived view; the captured HTML/JSON or local bytes are authoritative.",
        "No attachments, external embeds, transitive sources, comments or cross-page transaction.",
        "Read-only modes prevent accidents, not writes by the same OS user.",
      ],
      artifacts, sources,
    };
    await saveJson("manifest.json", manifest);
    await verifySnapshot(staging, options);
    await chmod(staging, 0o500);
    await rename(staging, folder);
    return folder;
  } finally {
    // Only this invocation's private staging directory and lock are removed.
    await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true });
  }
}
