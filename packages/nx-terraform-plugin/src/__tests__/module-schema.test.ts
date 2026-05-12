import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { modulePublishManifestSchema } from "../manifest.ts";

const packageRoot = path.resolve(import.meta.dirname, "..", "..");
const execFileAsync = promisify(execFile);

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

  it("stores module.schema.json with optional $schema support", async () => {
    await execFileAsync("node", ["src/generate-module-schema.ts"], {
      cwd: packageRoot,
    });

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
