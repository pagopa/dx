import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

const packageManifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
});

const readPackageManifest = async (
  packageJsonUrl: URL,
): Promise<z.output<typeof packageManifestSchema>> =>
  packageManifestSchema.parse(
    JSON.parse(await fs.readFile(packageJsonUrl, "utf8")),
  );

describe("package manifest", () => {
  it("depends on dx-tasks without duplicating its runtime provider dependencies", async () => {
    const manifest = await readPackageManifest(
      new URL("../../package.json", import.meta.url),
    );

    expect(manifest.dependencies["@pagopa/dx-tasks"]).toBe("workspace:^");
    expect(manifest.devDependencies["@pagopa/dx-tasks"]).toBeUndefined();
    expect(manifest.dependencies["@aws-sdk/client-s3"]).toBeUndefined();
    expect(manifest.dependencies["@azure/identity"]).toBeUndefined();
    expect(manifest.dependencies["@azure/storage-blob"]).toBeUndefined();
  });
});
