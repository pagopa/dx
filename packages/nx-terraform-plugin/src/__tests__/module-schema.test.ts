import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { modulePublishManifestSchema } from "../manifest.ts";

const packageRoot = path.resolve(import.meta.dirname, "..", "..");

describe("module schema generation", () => {
  it("exposes a generate script for the consumer manifest schema", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(packageRoot, "package.json"), "utf-8"),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.generate).toBe(
      "node src/generate-module-schema.ts",
    );
  });

  it("keeps module.schema.json in sync with the manifest schema", async () => {
    const manifestSchemaAsJsonSchema = z.toJSONSchema(
      modulePublishManifestSchema,
    );
    const generatedSchema = JSON.parse(
      await fs.readFile(path.join(packageRoot, "module.schema.json"), "utf-8"),
    );

    expect(generatedSchema).toEqual({
      ...manifestSchemaAsJsonSchema,
      properties: {
        ...manifestSchemaAsJsonSchema.properties,
        $schema: {
          type: "string",
        },
      },
    });
  });
});
