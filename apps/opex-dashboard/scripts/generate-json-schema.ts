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

/**
 * Transform camelCase keys to snake_case recursively.
 * The Zod schema uses camelCase internally but the YAML config uses snake_case.
 * Special handling for overrides.endpoints to preserve endpoint path keys.
 */
function camelToSnake(obj: unknown, path: string[] = []): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Special handling for 'required' arrays - convert string values to snake_case
    const parentKey = path[path.length - 1];
    if (parentKey === "required") {
      return obj.map((item) =>
        typeof item === "string"
          ? item.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
          : camelToSnake(item, path),
      );
    }
    return obj.map((item) => camelToSnake(item, path));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if we're at overrides.endpoints level or inside an endpoint
      const isEndpointsLevel =
        path.length === 2 && path[0] === "overrides" && path[1] === "endpoints";

      // Don't transform endpoint path keys (they are the keys inside overrides.endpoints)
      // but do transform property names inside endpoints
      const shouldPreserveKey =
        isEndpointsLevel &&
        (key === "propertyNames" ||
          key === "additionalProperties" ||
          key === "type");

      const snakeKey = shouldPreserveKey
        ? key
        : key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      const newPath = [...path, key];
      result[snakeKey] = camelToSnake(value, newPath);
    }
    return result;
  }

  return obj;
}

// Convert camelCase properties to snake_case for the JSON schema
const snakeCaseSchema = camelToSnake(jsonSchema);

// Remove optional fields with defaults from the required array
// These fields should be optional in the input but have default values
const optionalFieldsWithDefaults = [
  "availability_threshold",
  "response_time_threshold",
  "evaluation_frequency",
  "evaluation_time_window",
  "event_occurrences",
  "resource_type",
  "timespan",
];

if (snakeCaseSchema.required && Array.isArray(snakeCaseSchema.required)) {
  snakeCaseSchema.required = snakeCaseSchema.required.filter(
    (field: string) => !optionalFieldsWithDefaults.includes(field),
  );
}

// Add metadata to the schema
const schemaWithMetadata = {
  $id: "https://github.com/pagopa/dx/blob/main/apps/opex-dashboard/config.schema.json",
  $schema: "http://json-schema.org/draft-07/schema#",
  description:
    "Configuration schema for generating operational dashboards from OpenAPI specifications",
  title: "OpEx Dashboard Configuration",
  version: packageJson.default.version,
  ...snakeCaseSchema,
};

// Write schema to file with pretty-printing for better git diffs
writeFileSync(outputPath, JSON.stringify(schemaWithMetadata, null, 2) + "\n");

console.log(`✓ Generated JSON schema at ${outputPath}`);
console.log(`  Version: ${packageJson.default.version}`);
