/**
 * Generates the consumer-facing JSON Schema for module.json from the Zod schema.
 */

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";

import { modulePublishManifestSchema } from "./manifest.ts";

const outputPath = fileURLToPath(
  new URL("../module.schema.json", import.meta.url),
);
const manifestSchemaAsJsonSchema = z.toJSONSchema(modulePublishManifestSchema);
const moduleSchema = {
  ...manifestSchemaAsJsonSchema,
  properties: {
    ...manifestSchemaAsJsonSchema.properties,
    $schema: {
      type: "string",
    },
  },
};

await fs.writeFile(outputPath, JSON.stringify(moduleSchema, null, 2) + "\n");
