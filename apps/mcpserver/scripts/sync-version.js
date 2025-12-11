#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Synchronize version and metadata from package.json to server.json
 * This script is run automatically by changesets during version updates
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import packageJson from "../package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverJsonPath = join(__dirname, "..", "server.json");

async function syncVersion() {
  try {
    const { description, repository, version } = packageJson;

    // Generate server.json from package.json metadata
    const serverJson = {
      $schema:
        "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
      description,
      name: "io.github.pagopa/mcpserver",
      packages: [
        {
          httpHeaders: [
            {
              description: "GitHub Personal Access Token for authentication",
              isRequired: true,
              isSecret: true,
              name: "x-gh-pat",
            },
          ],
          identifier: "https://api.dx.pagopa.it/mcp",
          registryType: "http",
          transport: {
            type: "streamable-http",
            url: "https://api.dx.pagopa.it/mcp",
          },
          version,
        },
      ],
      repository: {
        source: "github",
        subfolder: repository.directory,
        url: repository.url.replace(/^git\+/, "").replace(/\.git$/, ""),
      },
      version,
    };

    // Write updated server.json
    await writeFile(
      serverJsonPath,
      JSON.stringify(serverJson, null, 2) + "\n",
      "utf8",
    );

    console.log(`✓ Synced version ${version} to server.json`);
  } catch (error) {
    console.error("Error syncing version:", error.message);
    process.exit(1);
  }
}

await syncVersion();
