#!/usr/bin/env node

/**
 * Synchronize version and metadata from package.json to server.json
 * This script is run automatically by changesets during version updates
 */

import console from "node:console";
import { writeFile } from "node:fs/promises";
import process from "node:process";

import packageJson from "../package.json" with { type: "json" };

async function writeMCPServerManifest() {
  const { description, repository, version } = packageJson;

  // Generate server.json from package.json metadata
  const serverJson = {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    description,
    name: "it.pagopa/dx",
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
  await writeFile("server.json", JSON.stringify(serverJson, null, 2) + "\n");

  return version;
}

try {
  const version = await writeMCPServerManifest();
  console.log(`✓ server.json correctly generated with version ${version}`);
} catch (error) {
  console.error("Error generating server.json:", error.message);
  console.error(error.stack);
  process.exit(1);
}
