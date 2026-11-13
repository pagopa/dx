// Exercises Confluence link extraction from Jira descriptions and its CLI.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { extractConfluenceLinks } from "./extract-confluence-links.js";

const script = fileURLToPath(
  new URL("./extract-confluence-links.js", import.meta.url),
);
const pageUrl = "https://example.atlassian.net/wiki/spaces/S/pages/101/Spec";
const description =
  `See [spec](${pageUrl}) and ${pageUrl}?focus=1 plus ` +
  "https://example.atlassian.net/wiki/pages/viewpage.action?spaceKey=S&amp;pageId=202.";

test("extracts each linked Confluence page once and lists links without a page ID", () => {
  assert.deepEqual(
    extractConfluenceLinks(
      `${description} Tiny https://example.atlassian.net/wiki/x/AbC and https://example.atlassian.net/wiki/spaces/S/pages/202`,
    ),
    {
      pages: [
        { id: "101", url: pageUrl },
        {
          id: "202",
          url: "https://example.atlassian.net/wiki/pages/viewpage.action?spaceKey=S&amp;pageId=202",
        },
      ],
      unresolved: ["https://example.atlassian.net/wiki/x/AbC"],
    },
  );
  assert.deepEqual(
    extractConfluenceLinks({
      type: "doc",
      content: [{ marks: [{ type: "link", attrs: { href: pageUrl } }] }],
    }).pages,
    [{ id: "101", url: pageUrl }],
  );
  assert.deepEqual(extractConfluenceLinks(null), { pages: [], unresolved: [] });
});

test("rejects a page ID linked from different Confluence sites", () => {
  assert.throws(
    () =>
      extractConfluenceLinks(
        "https://a.atlassian.net/wiki/pages/101 and " +
          "https://b.atlassian.net/wiki/pages/101",
      ),
    /Confluence page ID 101 is linked from multiple sites/,
  );
});

test("CLI prints the links of a Jira response and rejects responses without a description", async () => {
  const directory = await mkdtemp(join(tmpdir(), "padef-links-"));
  try {
    const cli = (path) =>
      spawnSync(process.execPath, [script, path], { encoding: "utf8" });
    const response = join(directory, "issue.json");
    await writeFile(
      response,
      JSON.stringify({ data: { key: "TEST-7", fields: { description } } }),
    );
    const listed = cli(response);
    assert.equal(listed.status, 0, listed.stderr);
    assert.deepEqual(
      JSON.parse(listed.stdout).pages.map(({ id }) => id),
      ["101", "202"],
    );

    await writeFile(response, JSON.stringify({ key: "TEST-7", fields: {} }));
    const failed = cli(response);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /^Links not extracted: .*description/);

    await writeFile(
      response,
      await readFile(
        new URL(
          "../evals/fixtures/retrieval-failure/jira-response.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const unavailable = cli(response);
    assert.equal(unavailable.status, 1);
    assert.match(unavailable.stderr, /Jira response is an error, not an issue/);
    assert.match(unavailable.stderr, /503/);
    assert.match(unavailable.stderr, /Jira is temporarily unavailable/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
