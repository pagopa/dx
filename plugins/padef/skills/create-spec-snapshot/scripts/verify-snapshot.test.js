// Exercises tamper and staleness checks on saved spec snapshots.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { saveSnapshot } from "./save-snapshot.js";
import {
  checkFreshness,
  StaleSnapshotError,
  TamperedSnapshotError,
  verifySnapshot,
} from "./verify-snapshot.js";

const script = fileURLToPath(new URL("./verify-snapshot.js", import.meta.url));
const pageUrl = (id) =>
  `https://example.atlassian.net/wiki/spaces/S/pages/${id}`;

const issue = (description, summary = "Summary") => ({
  key: "TEST-7",
  fields: { summary, description, updated: "2026-01-01", comment: "ignored" },
});

const page = (id, value = `# Page ${id}`) => ({
  data: {
    id,
    title: `Page ${id}`,
    body: { format: "markdown", value },
    metadata: { version: { number: 1 } },
  },
});

const linked = issue(`See ${pageUrl(101)} and ${pageUrl(202)}`);
const linkedPages = [page("101"), page("202")];

async function withSnapshot(run) {
  const cache = await mkdtemp(join(tmpdir(), "padef-verify-"));
  try {
    const options = { xdgCacheHome: cache };
    const { directory } = await saveSnapshot(linked, {
      ...options,
      pages: linkedPages,
    });
    await run({ cache, directory, options });
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
}

async function overwrite(path, content) {
  await chmod(path, 0o644);
  await writeFile(path, content);
}

test("detects edited, removed, added and unlisted snapshot files", async () => {
  await withSnapshot(async ({ directory, options }) => {
    await verifySnapshot("TEST-7", options);
    const pagePath = join(directory, "confluence-101.md");
    const sumsPath = join(directory, "SHA256SUMS");
    const sums = await readFile(sumsPath, "utf8");

    await overwrite(pagePath, "# Edited\n");
    await assert.rejects(
      verifySnapshot("TEST-7", options),
      /confluence-101.md does not match/,
    );
    await rm(pagePath);
    await assert.rejects(verifySnapshot("TEST-7", options), /missing/);

    await writeFile(join(directory, "extra.md"), "x");
    await assert.rejects(
      verifySnapshot("TEST-7", options),
      /extra.md is not listed/,
    );
    await rm(join(directory, "extra.md"));

    await overwrite(
      sumsPath,
      sums
        .split("\n")
        .filter((line) => !line.includes("confluence-101.md"))
        .join("\n"),
    );
    await assert.rejects(
      verifySnapshot("TEST-7", options),
      /do not match the linked Confluence pages/,
    );
  });
});

test("keeps the current snapshot verifiable when an unpublished generation remains", async () => {
  await withSnapshot(async ({ directory, options }) => {
    const interruptedGeneration = join(dirname(directory), "abcdef123456");
    await mkdir(interruptedGeneration);
    await writeFile(join(interruptedGeneration, "issue.json"), "incomplete");

    const verified = await verifySnapshot("TEST-7", options);
    assert.equal(verified.directory, directory);
  });
});

test("seeds evaluation snapshots through the CURRENT pointer", async () => {
  await withSnapshot(async ({ cache, options }) => {
    const seedScript = fileURLToPath(
      new URL("../evals/fixtures/seed-snapshot.mjs", import.meta.url),
    );
    const seed = fileURLToPath(
      new URL("../evals/fixtures/up-to-date/seed.json", import.meta.url),
    );
    const seeded = spawnSync(process.execPath, [seedScript, seed], {
      encoding: "utf8",
      env: { ...process.env, XDG_CACHE_HOME: cache },
    });

    assert.equal(seeded.status, 0, seeded.stderr);
    const verified = await verifySnapshot("TEST-2", options);
    assert.equal(verified.directory.endsWith("000000000001"), true);
  });
});

test("treats only changes to saved content as stale", async () => {
  await withSnapshot(async ({ options }) => {
    const unsavedChange = {
      ...linked,
      fields: { ...linked.fields, comment: "new" },
    };
    await checkFreshness(
      "TEST-7",
      { data: unsavedChange },
      {
        ...options,
        pages: [...linkedPages].reverse(),
      },
    );

    for (const [response, pages, changes] of [
      [
        issue(linked.fields.description, "New"),
        linkedPages,
        "issue.json changed",
      ],
      [
        linked,
        [page("101", "# New"), page("202")],
        "confluence-101.md changed",
      ],
      [
        issue(`See ${pageUrl(101)} and ${pageUrl(303)}`),
        [page("101"), page("303")],
        "confluence-202.md removed, confluence-303.md added, issue.json changed",
      ],
    ]) {
      await assert.rejects(
        checkFreshness("TEST-7", response, { ...options, pages }),
        (error) =>
          error instanceof StaleSnapshotError &&
          error.message.includes(changes),
      );
    }
    await assert.rejects(
      checkFreshness(
        "TEST-7",
        { ...linked, key: "TEST-8" },
        {
          ...options,
          pages: linkedPages,
        },
      ),
      /does not match the requested TEST-7/,
    );
    await assert.rejects(
      checkFreshness(
        "TEST-7",
        issue(
          "https://a.atlassian.net/wiki/pages/101 and " +
            "https://b.atlassian.net/wiki/pages/101",
        ),
        { ...options, pages: [page("101")] },
      ),
      /Confluence page ID 101 is linked from multiple sites/,
    );
  });
});

test("refuses a staleness verdict for a tampered snapshot", async () => {
  await withSnapshot(async ({ directory, options }) => {
    await overwrite(join(directory, "issue.json"), "{}\n");
    await assert.rejects(
      checkFreshness("TEST-7", linked, { ...options, pages: linkedPages }),
      (error) =>
        error instanceof TamperedSnapshotError &&
        /issue.json does not match/.test(error.message),
    );
  });
});

test("CLI exits 0 when verified, 2 when stale, 3 when tampered, 4 when missing", async () => {
  await withSnapshot(async ({ cache, directory }) => {
    const cli = (...args) =>
      spawnSync(process.execPath, [script, ...args], {
        encoding: "utf8",
        env: { ...process.env, XDG_CACHE_HOME: cache },
      });
    const write = async (name, value) => {
      const path = join(cache, name);
      await writeFile(path, JSON.stringify(value));
      return path;
    };
    const issuePath = await write("issue.json", linked);
    const pagePaths = [
      await write("p101.json", linkedPages[0]),
      await write("p202.json", linkedPages[1]),
    ];

    const tamper = cli("test-7");
    assert.equal(tamper.status, 0, tamper.stderr);
    assert.match(tamper.stdout, /not tampered\.$/m);
    const fresh = cli("test-7", issuePath, ...pagePaths);
    assert.equal(fresh.status, 0, fresh.stderr);
    assert.match(fresh.stdout, /not tampered and up to date/);

    const changed = await write(
      "changed.json",
      issue(linked.fields.description, "New"),
    );
    const stale = cli("test-7", changed, ...pagePaths);
    assert.equal(stale.status, 2);
    assert.match(stale.stderr, /^Snapshot stale: .*issue.json changed/);

    await overwrite(join(directory, "issue.json"), "{}\n");
    const tampered = cli("test-7", issuePath, ...pagePaths);
    assert.equal(tampered.status, 3);
    assert.match(tampered.stderr, /^Snapshot tampered: issue.json/);

    const invalid = await write("invalid.json", { key: "TEST-7" });
    assert.equal(cli("test-7", invalid).status, 1);

    const missing = cli("test-8");
    assert.equal(missing.status, 4);
    assert.match(missing.stderr, /^Snapshot missing: /);
  });
});
