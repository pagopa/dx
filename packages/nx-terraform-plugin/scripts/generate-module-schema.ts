/**
 * Generates the consumer-facing JSON Schema for module.json from the Zod schema.
 */

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";

import { modulePublishManifestSchema } from "../src/manifest.ts";

const outputPath = fileURLToPath(
  new URL("../module-schema.json", import.meta.url),
);
const moduleSchema = z.toJSONSchema(modulePublishManifestSchema);

await fs.writeFile(outputPath, JSON.stringify(moduleSchema, null, 2) + "\n");
