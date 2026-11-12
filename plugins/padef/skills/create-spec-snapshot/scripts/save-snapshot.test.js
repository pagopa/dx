// Exercises snapshot filtering, Confluence page capture and atomic persistence.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  filterIssue,
  resolveSnapshotPath,
  saveSnapshot,
} from "./save-snapshot.js";

const script = fileURLToPath(new URL("./save-snapshot.js", import.meta.url));

const issue = {
  id: "77",
  key: "TEST-7",
  self: "https://example.test/issue",
  fields: {
    parent: {
      id: "22",
      key: "TEST-2",
      fields: { summary: "Parent", status: { name: "Open" } },
      secret: "excluded",
    },
    issuetype: { id: "3", name: "Task", subtask: false, description: "extra" },
    project: { id: "4", key: "TEST", name: "Example", extra: "excluded" },
    updated: "2026-01-01",
    description: { type: "doc", content: [{ type: "text", text: "caffè" }] },
    summary: "$(touch PWNED)",
    comment: { comments: [{ body: "excluded" }] },
    customfield_123: "excluded",
  },
};

const expected = {
  id: "77",
  key: "TEST-7",
  fields: {
    parent: { id: "22", key: "TEST-2", fields: { summary: "Parent" } },
    issuetype: { id: "3", name: "Task", subtask: false },
    project: { id: "4", key: "TEST", name: "Example" },
    updated: "2026-01-01",
    description: issue.fields.description,
    summary: "$(touch PWNED)",
  },
};

const pageUrl = "https://example.atlassian.net/wiki/spaces/S/pages/101/Spec";

const page = (id, value = `# Page ${id}`) => ({
  data: {
    id,
    type: "page",
    title: `Page "${id}"`,
    body: { format: "markdown", value },
    metadata: { version: { number: 3 } },
  },
});

const withDescription = (description) => ({
  ...issue,
  fields: { ...issue.fields, description },
});

const linked = withDescription(
  `See [spec](${pageUrl}) and ${pageUrl}?focus=1 plus ` +
    "https://example.atlassian.net/wiki/pages/viewpage.action?spaceKey=S&amp;pageId=202.",
);

async function withCache(run) {
  const cache = await mkdtemp(join(tmpdir(), "padef-cache-"));
  try {
    await run(cache, join(cache, "padef", "snapshots"));
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
}

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("keeps exactly the requested fields, including rich description nodes", () => {
  assert.deepEqual(filterIssue(issue), expected);
});

test("preserves explicit nulls and leaves absent optional fields absent", () => {
  assert.deepEqual(
    filterIssue({ key: "TEST-1", fields: { parent: null, description: null } }),
    { key: "TEST-1", fields: { parent: null, description: null } },
  );
  assert.deepEqual(
    filterIssue({
      key: "TEST-1",
      fields: { parent: { fields: null }, description: "" },
    }),
    { key: "TEST-1", fields: { parent: { fields: null }, description: "" } },
  );
});

test("rejects unavailable descriptions, bad keys and malformed nested fields", () => {
  assert.throws(
    () => filterIssue({ key: "TEST-1", fields: {} }),
    /description/,
  );
  for (const key of ["ces-1", "../../escape", "CES-0", "CES-1/../x"]) {
    assert.throws(
      () => filterIssue({ key, fields: { description: null } }),
      /canonical issue key/,
    );
  }
  assert.throws(
    () =>
      filterIssue({
        key: "TEST-1",
        fields: { description: null, project: [] },
      }),
    /project must be an object or null/,
  );
  assert.throws(
    () =>
      filterIssue({
        key: "TEST-1",
        fields: { description: null, parent: { fields: "bad" } },
      }),
    /parent.fields must be an object or null/,
  );
});

test("resolves XDG_CACHE_HOME, defaults to ~/.cache and rejects relative XDG paths", () => {
  const options = { homeDir: "/home/tester" };
  assert.equal(
    resolveSnapshotPath("CES-1", { ...options, xdgCacheHome: "/var/cache" })
      .directory,
    "/var/cache/padef/snapshots/CES-1",
  );
  for (const xdgCacheHome of [undefined, ""]) {
    assert.equal(
      resolveSnapshotPath("CES-1", { ...options, xdgCacheHome }).directory,
      "/home/tester/.cache/padef/snapshots/CES-1",
    );
  }
  assert.throws(
    () =>
      resolveSnapshotPath("CES-1", { ...options, xdgCacheHome: "relative" }),
    /must be an absolute path/,
  );
});

test("saves the issue with one Markdown file per linked page and leaves no temporary files", async () => {
  await withCache(async (cache, snapshots) => {
    await mkdir(join(snapshots, "TEST-9"), { recursive: true });
    await writeFile(join(snapshots, "TEST-9", "sentinel.txt"), "KEEP");

    const result = await saveSnapshot(
      { data: linked, requestId: "x" },
      { xdgCacheHome: cache, expect: "77", pages: [page("202"), page("101")] },
    );

    const directory = join(snapshots, "TEST-7");
    assert.equal(result.directory, directory);
    assert.deepEqual(await readdir(snapshots), ["TEST-7", "TEST-9"]);
    assert.deepEqual(await readdir(directory), [
      "SHA256SUMS",
      "confluence-101.md",
      "confluence-202.md",
      "issue.json",
    ]);
    assert.equal(
      (await readJson(join(directory, "issue.json"))).fields.summary,
      expected.fields.summary,
    );
    assert.equal(
      await readFile(join(directory, "confluence-101.md"), "utf8"),
      `---\nid: "101"\ntitle: "Page \\"101\\""\nversion: 3\nurl: "${pageUrl}"\n---\n\n# Page 101\n`,
    );
    assert.equal(
      await readFile(join(snapshots, "TEST-9", "sentinel.txt"), "utf8"),
      "KEEP",
    );
  });
});

test("rejects bad responses and mismatched pages without touching the existing snapshot", async () => {
  await withCache(async (cache, snapshots) => {
    const existing = join(snapshots, "TEST-7", "issue.json");
    await mkdir(join(snapshots, "TEST-7"), { recursive: true });
    await writeFile(existing, "previous");
    const options = { xdgCacheHome: cache };

    for (const [response, pages, error] of [
      [{ isError: true, message: "No permission" }, [], /error/],
      [{ key: "TEST-7", fields: {} }, [], /description/],
      [linked, [page("101")], /page 202 was not supplied/],
      [issue, [page("101")], /page 101 is not linked/],
      [linked, [page("101"), page("101"), page("202")], /supplied twice/],
      [
        linked,
        [page("101"), { error: { status: 404, message: "Not found" } }],
        /error, not a page: \{"status":404,"message":"Not found"\}/,
      ],
      [
        linked,
        [
          page("101"),
          {
            data: {
              ...page("202").data,
              body: { format: "html", value: "<p/>" },
            },
          },
        ],
        /page 202 has no Markdown body/,
      ],
    ]) {
      await assert.rejects(
        saveSnapshot(response, { ...options, pages }),
        error,
      );
    }
    await assert.rejects(
      saveSnapshot(issue, { ...options, expect: "TEST-8" }),
      /does not match the requested TEST-8/,
    );
    assert.equal(await readFile(existing, "utf8"), "previous");
    assert.deepEqual(await readdir(snapshots), ["TEST-7"]);
  });
});

test("refuses symlinked destinations and a file blocking the issue directory", async () => {
  await withCache(async (cache, snapshots) => {
    const outside = await mkdtemp(join(tmpdir(), "padef-outside-"));
    try {
      await mkdir(snapshots, { recursive: true });
      await symlink(outside, join(snapshots, "TEST-7"));
      await assert.rejects(
        saveSnapshot(issue, { xdgCacheHome: cache }),
        /Refusing symlink/,
      );
      assert.deepEqual(await readdir(outside), []);

      await rm(join(snapshots, "TEST-7"));
      await writeFile(join(snapshots, "TEST-7"), "KEEP");
      await assert.rejects(
        saveSnapshot(issue, { xdgCacheHome: cache }),
        /not a directory/,
      );
      assert.equal(await readFile(join(snapshots, "TEST-7"), "utf8"), "KEEP");
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("CLI saves from response files and reports failures without a stack trace", async () => {
  await withCache(async (cache) => {
    const env = { ...process.env, XDG_CACHE_HOME: cache };
    const cli = (...args) =>
      spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env });
    const issuePath = join(cache, "issue-response.json");
    const pagePaths = [join(cache, "p101.json"), join(cache, "p202.json")];
    await writeFile(issuePath, JSON.stringify(linked));
    await writeFile(pagePaths[0], JSON.stringify(page("101")));
    await writeFile(pagePaths[1], JSON.stringify(page("202")));

    const saved = cli("--expect", "test-7", issuePath, ...pagePaths);
    assert.equal(saved.status, 0, saved.stderr);
    const directory = join(cache, "padef", "snapshots", "TEST-7");
    assert.equal(
      saved.stdout,
      `Saved TEST-7 snapshot with 2 Confluence page(s) to ${directory}\n`,
    );
    const existing = cli(issuePath, ...pagePaths);
    assert.equal(existing.status, 1);
    assert.match(existing.stderr, /already exists.*--replace/);
    const replaced = cli(
      "--replace",
      "--expect",
      "test-7",
      issuePath,
      ...pagePaths,
    );
    assert.equal(replaced.status, 0, replaced.stderr);

    const failed = cli(issuePath);
    assert.equal(failed.status, 1);
    assert.match(
      failed.stderr,
      /^Snapshot not saved: Linked Confluence page 101/,
    );
  });
});

test("checksums every file read-only and drops unlinked pages on refresh", async () => {
  await withCache(async (cache) => {
    const options = { xdgCacheHome: cache };
    const { directory } = await saveSnapshot(linked, {
      ...options,
      pages: [page("101"), page("202")],
    });
    await saveSnapshot(withDescription(`Only ${pageUrl}`), {
      ...options,
      replace: true,
      pages: [page("101", "# Updated")],
    });

    const files = ["SHA256SUMS", "confluence-101.md", "issue.json"];
    assert.deepEqual(await readdir(directory), files);
    const sums = await readFile(join(directory, "SHA256SUMS"), "utf8");
    const expectedSums = [];
    for (const name of files.slice(1)) {
      const hash = createHash("sha256")
        .update(await readFile(join(directory, name)))
        .digest("hex");
      expectedSums.push(`${hash}  ${name}\n`);
    }
    assert.equal(sums, expectedSums.join(""));
    for (const name of files) {
      assert.equal((await stat(join(directory, name))).mode & 0o777, 0o444);
    }
  });
});
