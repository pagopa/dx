#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Synchronize version from package.json to server.json
 * This script is run automatically by changesets during version updates
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, "package.json");
const serverJsonPath = join(__dirname, "server.json");

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const version = packageJson.version;

  // Read server.json
  const serverJson = JSON.parse(readFileSync(serverJsonPath, "utf8"));

  // Update version in server.json
  serverJson.version = version;
  if (serverJson.packages && serverJson.packages.length > 0) {
    serverJson.packages.forEach((pkg) => {
      pkg.version = version;
    });
  }

  // Write updated server.json
  writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 2) + "\n");

  console.log(`✓ Synced version ${version} to server.json`);
} catch (error) {
  console.error("Error syncing version:", error.message);
  process.exit(1);
}
