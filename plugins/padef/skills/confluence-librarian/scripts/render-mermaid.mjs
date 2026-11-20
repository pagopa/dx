#!/usr/bin/env node
// Render a Mermaid fence to SVG with Pele. The version is pinned here and
// installed once into a cache directory, so repeat runs render in-process.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PELE_VERSION = "1.13.0";
const cacheRoot =
  process.env.CONFLUENCE_LIBRARIAN_CACHE ??
  join(tmpdir(), "confluence-librarian");
const peleDir = join(cacheRoot, `pele-${PELE_VERSION}`);
const peleEntry = join(peleDir, "node_modules/pele/dist/pele.js");

const [fenceArg, outPath] = process.argv.slice(2);
if (!fenceArg || !outPath) {
  console.error("usage: render-mermaid.mjs <fence-file|-> <output.svg>");
  process.exit(2);
}

if (!existsSync(peleEntry)) {
  mkdirSync(peleDir, { recursive: true });
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
