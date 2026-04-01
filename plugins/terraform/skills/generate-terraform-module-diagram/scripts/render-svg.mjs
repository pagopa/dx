#!/usr/bin/env node
/**
 * render-svg.mjs — Convert a Mermaid .mmd file to .svg with inlined cloud provider icons.
 *
 * Icon packs registered at render time:
 *   - Azure: NakayamaKento/AzureIcons (566 service icons, prefix "azure")
 *     Diagram syntax: azure:icon-name  e.g. azure:virtual-networks
 *   - AWS:   @iconify-json/logos (67 AWS service icons, prefix "logos")
 *     Diagram syntax: logos:aws-*      e.g. logos:aws-lambda
 *
 * Icons are fully inlined as SVG paths in the output — no external references at view time.
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
  console.log("Icon packs registered at render time:");
  console.log(`  azure: -> ${AZURE_ICONS_URL}`);
  console.log(`  logos: -> ${AWS_LOGOS_PACK} (via unpkg CDN)`);
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

console.log(`Rendering: ${inputFile} -> ${outputFile}`);
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
  `azure#${AZURE_ICONS_URL}`,
  "--iconPacks",
  AWS_LOGOS_PACK,
];

const result = spawnSync(cmd, mmdcArgs, { stdio: "inherit", encoding: "utf8" });

if (result.error) {
  console.error(`Render error: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error("Rendering failed.");
  console.error("  Validate syntax at: https://mermaid.live");
  console.error(
    "  Check Azure icon names: https://github.com/NakayamaKento/AzureIcons",
  );
  console.error(
    "  Check AWS icon names: https://icon-sets.iconify.design/logos/ (filter aws-)",
  );
  process.exit(1);
}

if (!existsSync(outputFile)) {
  console.error("SVG file was not created despite a successful exit code.");
  process.exit(1);
}

const sizeKb = (statSync(outputFile).size / 1024).toFixed(1);
console.log(`SVG generated: ${outputFile} (${sizeKb} KB)`);
console.log("Icons are fully inlined — no external dependencies.");

/**
 * Resolve the mmdc command, in priority order:
 *   1. Local node_modules/.bin/mmdc
 *   2. Global mmdc in PATH
 *   3. npx @mermaid-js/mermaid-cli (auto-install on demand)
 *
 * @returns {{ cmd: string, cmdArgs: string[] }}
 */
function resolveMmdc() {
  const localBin = resolve(process.cwd(), "node_modules/.bin/mmdc");
  if (existsSync(localBin)) {
    return { cmd: localBin, cmdArgs: [] };
  }

  const globalCheck = spawnSync("mmdc", ["--version"], { encoding: "utf8" });
  if (globalCheck.status === 0) {
    return { cmd: "mmdc", cmdArgs: [] };
  }

  console.log(
    "mmdc not found — downloading via npx @mermaid-js/mermaid-cli ...",
  );
  return { cmd: "npx", cmdArgs: ["-y", "@mermaid-js/mermaid-cli"] };
}
