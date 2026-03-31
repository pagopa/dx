#!/usr/bin/env node
/**
 * render-svg.mjs — Convert a Mermaid .mmd file to .svg with inlined cloud provider icons.
 *
 * Icons are loaded from:
 *   - Azure: NakayamaKento/AzureIcons (566 service-specific icons, prefix "Azure")
 *   - AWS:   @iconify-json/logos (67 AWS service icons, prefix "logos")
 *
 * Both packs are passed to mmdc via --iconPacksNamesAndUrls / --iconPacks so that
 * icons are fully inlined as SVG paths in the output — no external references needed.
 *
 * Usage:
 *   node render-svg.mjs <input.mmd> [output.svg]
 *
 * Requirements:
 *   - Node.js >= 18
 *   - mmdc available globally, or npx to fetch @mermaid-js/mermaid-cli on demand
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const AZURE_ICONS_URL =
  "https://raw.githubusercontent.com/NakayamaKento/AzureIcons/refs/heads/main/icons.json";
const AWS_LOGOS_PACK = "@iconify-json/logos";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: node render-svg.mjs <input.mmd> [output.svg]");
  console.log("");
  console.log("  input.mmd  — Mermaid diagram source file");
  console.log(
    "  output.svg — SVG output path (default: replaces .mmd extension with .svg)",
  );
  console.log("");
  console.log("Icon packs loaded at render time:");
  console.log(`  Azure → ${AZURE_ICONS_URL}`);
  console.log(`  AWS   → ${AWS_LOGOS_PACK} (via unpkg CDN)`);
  process.exit(args.length === 0 ? 1 : 0);
}

const inputFile = resolve(args[0]);
const outputFile = args[1]
  ? resolve(args[1])
  : inputFile.replace(/\.mmd$/, ".svg");

if (!existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log(`Rendering: ${inputFile} → ${outputFile}`);
console.log("Loading icon packs (requires internet access)...");

const { cmd, cmdArgs } = resolveMmdc();

const mmdcArgs = [
  ...cmdArgs,
  "-i",
  inputFile,
  "-o",
  outputFile,
  "-t",
  "dark",
  "-b",
  "transparent",
  "--iconPacksNamesAndUrls",
  `Azure#${AZURE_ICONS_URL}`,
  "--iconPacks",
  AWS_LOGOS_PACK,
];

const result = spawnSync(cmd, mmdcArgs, { stdio: "inherit", encoding: "utf8" });

if (result.error) {
  console.error(`Render error: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    "Rendering failed. Validate the Mermaid syntax at https://mermaid.live",
  );
  console.error(
    "Ensure icon names exist: Azure → https://github.com/NakayamaKento/AzureIcons",
  );
  console.error(
    "                         AWS   → https://icon-sets.iconify.design/logos/",
  );
  process.exit(1);
}

if (!existsSync(outputFile)) {
  console.error("SVG file was not created despite a successful exit code.");
  process.exit(1);
}

const sizeKb = (statSync(outputFile).size / 1024).toFixed(1);
console.log(`✓ SVG generated: ${outputFile} (${sizeKb} KB)`);
console.log("  Icons are fully inlined — no external dependencies in the SVG.");

/**
 * Resolve the mmdc command, in priority order:
 *   1. Local node_modules/.bin/mmdc
 *   2. Global mmdc in PATH
 *   3. npx @mermaid-js/mermaid-cli (auto-install on demand)
 *
 * @returns {{ cmd: string, cmdArgs: string[] }}
 */
function resolveMmdc() {
  // 1. Local node_modules
  const localBin = resolve(process.cwd(), "node_modules/.bin/mmdc");
  if (existsSync(localBin)) {
    return { cmd: localBin, cmdArgs: [] };
  }

  // 2. Global mmdc
  const globalCheck = spawnSync("mmdc", ["--version"], { encoding: "utf8" });
  if (globalCheck.status === 0) {
    return { cmd: "mmdc", cmdArgs: [] };
  }

  // 3. npx fallback
  console.log(
    "mmdc not found — downloading via npx @mermaid-js/mermaid-cli ...",
  );
  return { cmd: "npx", cmdArgs: ["-y", "@mermaid-js/mermaid-cli"] };
}
