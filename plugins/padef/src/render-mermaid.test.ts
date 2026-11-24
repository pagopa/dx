import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The skill ships this bundle on its own, so its sources stay off a JS build
// stack: the Node runner covers them.
// oxlint-disable-next-line vitest/no-import-node-test
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderFence, usage } from "./render-mermaid.ts";

const bundle = fileURLToPath(
  new URL(
    "../skills/confluence-librarian/scripts/render-mermaid.mjs",
    import.meta.url,
  ),
);

const fence = "graph TD;A[Start]-->B{OK?};B-->|yes|C[Ship];B-->|no|D[Fix]";

test("renders a flowchart to SVG", () => {
  const diagram = renderFence(fence);

  assert.equal(diagram.type, "flowchart");
  assert.ok(diagram.width > 0 && diagram.height > 0);
  assert.match(diagram.svg, /^<svg/);
});

test("rejects text that holds no diagram", () => {
  assert.throws(() => renderFence("not a diagram"), /No diagram type detected/);
});

test("ships as a bundle that imports only Node builtins", async () => {
  const source = await readFile(bundle, "utf8");
  const specifiers = [...source.matchAll(/from\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.ok(specifiers.length > 0, "the bundle imports nothing at all");
  for (const specifier of specifiers) {
    assert.match(specifier, /^node:/);
  }
});

test("prints the usage and exits 2 without arguments", () => {
  const result = spawnSync(process.execPath, [bundle], { encoding: "utf8" });

  assert.equal(result.status, 2);
  assert.match(result.stderr, new RegExp(usage));
});

test("renders stdin into the named file", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "render-mermaid-"));
  const outPath = join(workDir, "diagram.svg");
  await writeFile(join(workDir, "fence.mmd"), fence);

  const result = spawnSync(
    process.execPath,
    [bundle, join(workDir, "fence.mmd"), outPath],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^rendered flowchart \d+x\d+ -> /);
  assert.match(await readFile(outPath, "utf8"), /^<svg/);
});
