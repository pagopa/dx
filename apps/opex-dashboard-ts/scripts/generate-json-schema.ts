#!/usr/bin/env node
/**
 * Generate JSON Schema from Zod configuration schema.
 * This script is run during the build process to ensure the JSON schema
 * is always in sync with the TypeScript types.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { ConfigSchema } from "../src/core/config/config.schema.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputPath = resolve(projectRoot, "config.schema.json");

// Read package.json for version
const packageJson = await import("../package.json", {
  assert: { type: "json" },
});

// Generate JSON Schema from Zod schema using built-in toJsonSchema method
const jsonSchema = z.toJSONSchema(ConfigSchema);

// Remove optional fields with defaults from the required array
// These fields should be optional in the input but have default values
const optionalFieldsWithDefaults = [
  "evaluation_frequency",
  "evaluation_time_window",
  "event_occurrences",
  "resource_type",
  "timespan",
];

if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
  jsonSchema.required = jsonSchema.required.filter(
    (field: string) => !optionalFieldsWithDefaults.includes(field)
  );
}

// Add metadata to the schema
const schemaWithMetadata = {
  $id: "https://github.com/gunzip/opex-dashboard-ts/blob/main/config.schema.json",
  $schema: "http://json-schema.org/draft-07/schema#",
  description:
    "Configuration schema for generating operational dashboards from OpenAPI specifications",
  title: "OpEx Dashboard Configuration",
  version: packageJson.default.version,
  ...jsonSchema,
};

// Write schema to file with pretty-printing for better git diffs
writeFileSync(outputPath, JSON.stringify(schemaWithMetadata, null, 2) + "\n");

console.log(`✓ Generated JSON schema at ${outputPath}`);
console.log(`  Version: ${packageJson.default.version}`);
