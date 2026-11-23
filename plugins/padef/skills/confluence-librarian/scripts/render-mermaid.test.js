// Exercises the trust checks on the directory the renderer imports Pele from.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./render-mermaid.mjs", import.meta.url));
const peleVersion = "1.13.0";
// A stub stands in for the real package so the checks run without npm.
const stub =
  'export function render() { return { type: "svg", width: 1, height: 1, svg: "<svg/>" }; }\n';

async function plantPele(cacheRoot) {
  const entry = join(
    cacheRoot,
    `pele-${peleVersion}`,
    "node_modules/pele/dist",
  );
  await mkdir(entry, { recursive: true });
  await writeFile(join(entry, "pele.js"), stub);
}

function run(cacheRoot, workDir) {
  const fence = join(workDir, "fence.mmd");
  return spawnSync(
    process.execPath,
    [script, fence, join(workDir, "out.svg")],
    {
      encoding: "utf8",
      env: { ...process.env, CONFLUENCE_LIBRARIAN_CACHE: cacheRoot },
    },
  );
}

test("refuses a cache root reached through a symlink", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "render-mermaid-link-"));
  try {
    await writeFile(join(workDir, "fence.mmd"), "graph TD; A-->B;");
    const target = join(workDir, "target");
    await plantPele(target);
    const link = join(workDir, "link");
    await symlink(target, link);

    const result = run(link, workDir);

    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /not a private directory/);
    // The reported path is the cache root, not the leaf below it.
    assert.ok(result.stderr.includes(link), result.stderr);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("tightens a cache directory that is shared with other accounts", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "render-mermaid-mode-"));
  try {
    await writeFile(join(workDir, "fence.mmd"), "graph TD; A-->B;");
    const cacheRoot = join(workDir, "cache");
    await plantPele(cacheRoot);
    const peleDir = join(cacheRoot, `pele-${peleVersion}`);
    await chmod(cacheRoot, 0o777);
    await chmod(peleDir, 0o777);

    const result = run(cacheRoot, workDir);

    assert.equal(result.status, 0, result.stderr);
    assert.equal((await stat(cacheRoot)).mode & 0o777, 0o700);
    assert.equal((await stat(peleDir)).mode & 0o777, 0o700);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});
