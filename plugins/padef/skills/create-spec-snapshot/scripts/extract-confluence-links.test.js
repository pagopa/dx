// Exercises Confluence link extraction from Jira descriptions and its CLI.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
