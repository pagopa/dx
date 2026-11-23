#!/usr/bin/env node
// Render a Mermaid fence to SVG with Pele. The version is pinned here and
// installed once into a cache directory, so repeat runs render in-process.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PELE_VERSION = "1.13.0";
const uid = typeof process.getuid === "function" ? process.getuid() : "user";
const cacheRoot =
  process.env.CONFLUENCE_LIBRARIAN_CACHE ??
  join(tmpdir(), `confluence-librarian-${uid}`);
const peleDir = join(cacheRoot, `pele-${PELE_VERSION}`);
const peleEntry = join(peleDir, "node_modules/pele/dist/pele.js");

const [fenceArg, outPath] = process.argv.slice(2);
if (!fenceArg || !outPath) {
  console.error("usage: render-mermaid.mjs <fence-file|-> <output.svg>");
  process.exit(2);
}

// The cache is imported as code, so it must be ours alone: a shared location
// could hold a module another account planted there.
function privateDir(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const stats = lstatSync(path);
  const owned = typeof process.getuid !== "function" || stats.uid === uid;
  if (stats.isSymbolicLink() || !stats.isDirectory() || !owned) {
    console.error(`error cache directory ${path} is not a private directory`);
    process.exit(1);
  }
  // An existing directory keeps the mode it already had, and whoever can write
  // to it can plant the module we are about to import.
  chmodSync(path, 0o700);
}

// Every level is checked, not just the leaf: an ancestor we do not own can be
// renamed out from under us between the check and the import.
privateDir(cacheRoot);
privateDir(peleDir);

if (!existsSync(peleEntry)) {
  try {
    execFileSync(
      "npm",
      [
        "install",
        "--prefix",
        peleDir,
        `pele@${PELE_VERSION}`,
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
      ],
      { stdio: ["ignore", "ignore", "inherit"] },
    );
  } catch (error) {
    console.error(`error pele install failed: ${error.message}`);
    process.exit(1);
  }
}

const { render } = await import(pathToFileURL(peleEntry).href);
const source =
  fenceArg === "-" ? readFileSync(0, "utf8") : readFileSync(fenceArg, "utf8");

let diagram;
try {
  diagram = render(source);
} catch (error) {
  // Pele's stack traces carry the whole minified bundle; the message is the signal.
  console.error(`error ${error.message}`);
  process.exit(1);
}

writeFileSync(outPath, diagram.svg);
console.log(
  `rendered ${diagram.type} ${diagram.width}x${diagram.height} -> ${outPath}`,
);
