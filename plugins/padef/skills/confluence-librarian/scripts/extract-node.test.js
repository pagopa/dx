// Exercises extraction of complete nodes from a Confluence HTML baseline.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { describeMatches, findElements, scanHtml } from "./extract-node.js";

const script = fileURLToPath(new URL("./extract-node.js", import.meta.url));
const baseline = [
  '<div data-type="panel-info" data-local-id="panel-1">',
  "  <p>rollout date is set on the PRD.</p>",
  "</div>",
  '<section data-local-id="sec-2">',
  "  <h2>Rollout</h2>",
  '  <details data-local-id="expand-3"><summary>Mermaid source</summary>',
  '    <pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>',
  "  </details>",
  "  <p>Rollout window: 10 days, with <strong>rollout date</strong> tracked.</p>",
  '  <p title="panel-scoped-note">Attribute text is not body text.</p>',
  "  <br><img src=x.png><p>After void elements.</p>",
  "</section>",
  '<div data-type="panel-warning" data-local-id="panel-4">',
  "<p>Rollout stops on error.</p>",
  "</div>",
  '<script>var rollout = "rollout date";</script>',
].join("\n");

test("keeps nesting intact across comments, void elements and raw text", () => {
  const html = `${baseline}\n<!-- <div> -->`;
  const { elements } = scanHtml(html);
  const details = elements.find((element) => element.localId === "expand-3");
  assert.equal(details.tag, "details");
  assert.equal(
    html.slice(details.start, details.end),
    '<details data-local-id="expand-3"><summary>Mermaid source</summary>\n' +
      '    <pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>\n' +
      "  </details>",
  );
  const panel = elements.find((element) => element.localId === "panel-1");
  assert.equal(panel.end - panel.start > 0, true);
  assert.equal(
    elements.some((element) => element.tag === "script"),
    true,
  );
});

test("selects a node by data-local-id and prints the whole element", () => {
  const { matches } = findElements(baseline, { localId: "sec-2" });
  assert.equal(matches.length, 1);
  const output = describeMatches(baseline, matches);
  assert.match(output, /^match 1\/1 — <section> — bytes \d+-\d+ \(\d+\) — /);
  assert.match(output, /path: section\[local-id=sec-2\]/);
  assert.match(output, /data-local-id=sec-2/);
  assert.match(output, /<p>After void elements\.<\/p>/);
  assert.match(output, /<\/section>$/);
});

test("selects the innermost element holding a text needle", () => {
  const { matches } = findElements(baseline, { text: "Rollout window" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].tag, "p");
  assert.equal(
    baseline.slice(matches[0].start, matches[0].end),
    "<p>Rollout window: 10 days, with <strong>rollout date</strong> tracked.</p>",
  );
  assert.match(describeMatches(baseline, matches), /section\[local-id=sec-2\]/);
});

test("ignores needles in attributes and raw text", () => {
  assert.equal(
    findElements(baseline, { text: "panel-scoped-note" }).matches.length,
    0,
  );
  assert.equal(
    findElements(baseline, { text: "var rollout" }).matches.length,
    0,
  );
  const body = findElements(baseline, { text: "Attribute text" });
  assert.equal(body.matches.length, 1);
  assert.equal(body.matches[0].tag, "p");
});

test("surfaces ambiguity instead of truncating a match", () => {
  const { matches } = findElements(baseline, { text: "rollout date" });
  assert.equal(matches.length, 2);
  const output = describeMatches(baseline, matches);
  assert.match(output, /match 1\/2/);
  assert.match(output, /match 2\/2 — <strong>/);
});

test("scopes a text needle to the requested local-id", () => {
  const scoped = findElements(baseline, {
    text: "rollout date",
    localId: "panel-1",
  });
  assert.equal(scoped.matches.length, 1);
  assert.equal(
    baseline.slice(scoped.matches[0].start, scoped.matches[0].end),
    "<p>rollout date is set on the PRD.</p>",
  );
  const outside = findElements(baseline, {
    text: "rollout date",
    localId: "panel-4",
  });
  assert.equal(outside.matches.length, 0);
  assert.equal(outside.textMisses.length, 2);
});

test("lists anchors without the element body", async () => {
  const directory = await mkdtemp(join(tmpdir(), "extract-node-"));
  const file = join(directory, "baseline.html");
  await writeFile(file, baseline);
  try {
    const list = spawnSync(
      process.execPath,
      [script, file, "--local-id", "sec-2", "--list"],
      {
        encoding: "utf8",
      },
    );
    assert.equal(list.status, 0);
    assert.match(
      list.stdout.trim(),
      /^1\/1 section\[local-id=sec-2\] — bytes \d+-\d+$/,
    );
    assert.doesNotMatch(list.stdout, /<section/);

    const ambiguous = spawnSync(
      process.execPath,
      [script, file, "--text", "rollout date"],
      {
        encoding: "utf8",
      },
    );
    assert.equal(ambiguous.status, 2);
    assert.match(ambiguous.stdout, /Ambiguous: 2 elements match/);

    const missing = spawnSync(
      process.execPath,
      [script, file, "--local-id", "nope"],
      {
        encoding: "utf8",
      },
    );
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /No element matches local-id "nope"/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("matches a needle spanning inline markup and entities", () => {
  const html =
    "<div><p>R&amp;D notes</p>" +
    "<p>rollout <strong>date</strong> is set.</p></div>";
  const entities = findElements(html, { text: "R&D" });
  assert.equal(entities.matches.length, 1);
  assert.equal(
    html.slice(entities.matches[0].start, entities.matches[0].end),
    "<p>R&amp;D notes</p>",
  );

  const inline = findElements(html, { text: "rollout date" });
  assert.equal(inline.matches.length, 1);
  assert.equal(inline.matches[0].tag, "p");
});

test("reads the page from stdin when the path is -", async () => {
  const stdin = spawnSync(
    process.execPath,
    [script, "-", "--local-id", "sec-2", "--list"],
    { input: baseline, encoding: "utf8" },
  );
  assert.equal(stdin.status, 0);
  assert.match(
    stdin.stdout.trim(),
    /^1\/1 section\[local-id=sec-2\] — bytes \d+-\d+$/,
  );
});
