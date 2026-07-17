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
  it("declares external runtime dependencies for bundled dx-tasks code", async () => {
    const manifest = await readPackageManifest(
      new URL("../../package.json", import.meta.url),
    );
    const dxTasksManifest = await readPackageManifest(
      new URL("../../../dx-tasks/package.json", import.meta.url),
    );

    expect(manifest.devDependencies["@pagopa/dx-tasks"]).toBe("workspace:^");
    expect(manifest.dependencies["@pagopa/dx-tasks"]).toBeUndefined();

    for (const dependencyName of [
      "@aws-sdk/client-s3",
      "@azure/identity",
      "@azure/storage-blob",
      "octokit",
      "zod",
    ]) {
      expect(manifest.dependencies[dependencyName]).toBe(
        dxTasksManifest.dependencies[dependencyName],
      );
    }
  });

  it("keeps third-party node_modules out of the plugin bundle", async () => {
    await expect(
      fs.readFile(new URL("../../tsdown.config.ts", import.meta.url), "utf8"),
    ).resolves.toContain("skipNodeModulesBundle: true");
  });
});
