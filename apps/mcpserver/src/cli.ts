#!/usr/bin/env node
/**
 * CLI entry point for the MCP server.
 *
 * This file keeps runtime side effects limited to a single entrypoint and
 * delegates all application logic to the main module.
 */

import { main } from "./index.js";

main(process.env).catch((error: unknown) => {
  console.error("Failed to start MCP server", error);
  process.exitCode = 1;
});
