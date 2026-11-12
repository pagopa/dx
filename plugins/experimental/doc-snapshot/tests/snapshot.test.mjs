// Exercise byte preservation, offline reuse and failure boundaries without remote writes.
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  captureSnapshot, discoverSources, sha256, snapshotPath, verifySnapshot,
} from "../scripts/snapshot-core.mjs";

const site = "https://pagopa.atlassian.net";
const pageUrl = `${site}/wiki/spaces/PADEF/pages/123/Requirements`;
const page = {
  id: "123", type: "page", status: "current", title: "Requirements",
  metadata: { version: { number: 7 } },
  body: { format: "html", value: "<h1>Requirements</h1><p>Exact &amp; complete.</p>" },
};

async function removeFixture(path) {
  const info = await stat(path);
  if (info.isDirectory()) {
    await chmod(path, 0o700);
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isDirectory()) await removeFixture(join(path, entry.name));
    }
  }
  await rm(path, { recursive: true, force: true });
}

async function fixture(t, description = `<p><a href="${pageUrl}">Spec</a></p>`) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "padef-test-")));
  t.after(() => removeFixture(root));
  const repoRoot = join(root, "repo");
  await mkdir(repoRoot);
  const options = { root: join(root, "snapshots"), site, ticket: "TEST-1", handoff: "one", repoRoot };
  const calls = [];
  const call = async (name) => {
    calls.push(name);
    if (name === "getJiraIssue") {
      return { key: "TEST-1", fields: { summary: "Test", description, updated: "2026-11-06" } };
    }
    if (name === "executeRead") return [];
    if (name === "getConfluenceContent") return page;
    throw new Error(`Unexpected call: ${name}`);
  };
  return { options, call, calls };
}

test("captures exact HTML, derived Markdown and hashes; reuses without any calls", async (t) => {
  const { options, call, calls } = await fixture(t);
  const folder = await captureSnapshot(options, call);
  const manifest = await verifySnapshot(folder, options);
  const html = manifest.sources[0].artifacts.find((a) => a.file.endsWith(".html"));
  assert.equal(await readFile(join(folder, html.file), "utf8"), page.body.value);
  assert.equal(html.sha256, sha256(page.body.value));
  assert.equal(manifest.sources[0].version, 7);
  assert.equal((await stat(folder)).mode & 0o222, 0);
  const count = calls.length;
  assert.equal(await captureSnapshot(options, () => assert.fail("Network on reuse")), folder);
  assert.equal(calls.length, count);
});

test("detects tampering and refuses a live replacement", async (t) => {
  const { options, call } = await fixture(t);
  const folder = await captureSnapshot(options, call);
  const path = join(folder, "page-123-v7.md");
  await chmod(path, 0o600);
  await writeFile(path, "changed");
  await assert.rejects(captureSnapshot(options, () => assert.fail("Live repair")), /integrity/);
});

test("new handoff creates a distinct bundle without changing the old one", async (t) => {
  const { options, call } = await fixture(t);
  const first = await captureSnapshot(options, call);
  const second = await captureSnapshot({ ...options, handoff: "two" }, call);
  assert.notEqual(first, second);
  await verifySnapshot(first, options);
});

test("failed downloads publish nothing and a retry succeeds", async (t) => {
  const { options, call } = await fixture(t);
  await assert.rejects(captureSnapshot(options, (name) => {
    if (name === "getConfluenceContent") throw new Error("Remote unavailable");
    return call(name);
  }), /Remote unavailable/);
  await assert.rejects(stat(snapshotPath(options)), { code: "ENOENT" });
  await captureSnapshot(options, call);
});

test("empty or macro-dependent bundles fail explicitly", async (t) => {
  const empty = await fixture(t, "<p>No sources</p>");
  await assert.rejects(captureSnapshot(empty.options, empty.call), /empty snapshot/);
  const macro = await fixture(t);
  await assert.rejects(captureSnapshot(macro.options, (name) =>
    name === "getConfluenceContent"
      ? { ...page, body: { format: "html", value: '<ac:structured-macro ac:name="include"/>' } }
      : macro.call(name)), /dynamic content/);
});

test("preserves local bytes despite source lines merged by HTML conversion", async (t) => {
  const { options, call } = await fixture(t,
    "<p>Source: DR-01\nSource documents: <code>spec.md</code></p>");
  const bytes = Buffer.from("# Spec\r\n\r\nUnicode: \u00e8\r\n");
  await writeFile(join(options.repoRoot, "spec.md"), bytes);
  const folder = await captureSnapshot(options, call);
  const manifest = await verifySnapshot(folder, options);
  assert.deepEqual(await readFile(join(folder, manifest.sources[0].artifacts[0].file)), bytes);
});

test("rejects local traversal and symlink escape", async (t) => {
  for (const locator of ["../outside.md", "linked.md"]) {
    const { options, call } = await fixture(t, `Source documents: \`${locator}\``);
    const outside = join(options.repoRoot, "..", "outside.md");
    await writeFile(outside, "outside");
    await symlink(outside, join(options.repoRoot, "linked.md"));
    await assert.rejects(captureSnapshot(options, call), /escapes repository/);
  }
});

test("merges remote links and body links; rejects unsupported Confluence URLs", () => {
  assert.deepEqual(discoverSources(pageUrl, [{ object: { url: pageUrl } }], site), {
    confluence: [pageUrl], local: [],
  });
  assert.throws(() => discoverSources(`${site}/wiki/spaces/X/overview`, [], site), /Unsupported/);
});

test("rejects unsafe ticket and handoff paths before any writes", () => {
  assert.throws(() => snapshotPath({ root: "/tmp", site, ticket: "../x", handoff: "one" }));
  assert.throws(() => snapshotPath({ root: "/tmp", site, ticket: "TEST-1", handoff: "../x" }));
});
