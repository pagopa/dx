/** This module imports Terraform module usage and registry release metrics. */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { sql } from "drizzle-orm";
import * as schema from "../../../src/db/schema";
import type { ImportContext } from "../import-context";
import { sleep } from "../importer-helpers";

interface TerrawizModule {
  source: string;
  sourceType: string;
  version: string;
  repository: string;
  filePath: string;
  lineNumber: number;
}

interface TerrawizOutput {
  modules: TerrawizModule[];
}

interface TerraformRegistryModule {
  name: string;
  provider: string;
  namespace: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTerrawizOutput = (value: unknown): TerrawizOutput => {
  if (!isRecord(value) || !Array.isArray(value.modules)) {
    return { modules: [] };
  }

  const modules = value.modules.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        source: typeof item.source === "string" ? item.source : "",
        sourceType: typeof item.sourceType === "string" ? item.sourceType : "",
        version: typeof item.version === "string" ? item.version : "",
        repository: typeof item.repository === "string" ? item.repository : "",
        filePath: typeof item.filePath === "string" ? item.filePath : "",
        lineNumber: typeof item.lineNumber === "number" ? item.lineNumber : 0,
      },
    ];
  });

  return { modules };
};

const parseRegistryModulesPage = (value: unknown) => {
  if (!isRecord(value)) {
    return { modules: [] as TerraformRegistryModule[], nextUrl: null as string | null };
  }

  const modules = Array.isArray(value.modules)
    ? value.modules.flatMap((item) => {
        if (
          !isRecord(item) ||
          typeof item.name !== "string" ||
          typeof item.provider !== "string" ||
          typeof item.namespace !== "string"
        ) {
          return [];
        }

        return [
          {
            name: item.name,
            provider: item.provider,
            namespace: item.namespace,
          },
        ];
      })
    : [];

  const nextUrl =
    isRecord(value.meta) && typeof value.meta.next_url === "string"
      ? value.meta.next_url
      : null;

  return { modules, nextUrl };
};

const parseRegistryVersions = (value: unknown): string[] => {
  if (!isRecord(value) || !Array.isArray(value.modules)) {
    return [];
  }

  const firstModule = value.modules[0];
  if (!isRecord(firstModule) || !Array.isArray(firstModule.versions)) {
    return [];
  }

  return firstModule.versions.flatMap((item) => {
    if (!isRecord(item) || typeof item.version !== "string") {
      return [];
    }

    return [item.version];
  });
};

const parsePublishedAt = (value: unknown): Date | null => {
  if (!isRecord(value) || typeof value.published_at !== "string") {
    return null;
  }

  const publishedAt = new Date(value.published_at);
  return Number.isNaN(publishedAt.getTime()) ? null : publishedAt;
};

const sortVersions = (versions: string[]): string[] =>
  [...versions].sort((left, right) => {
    const parseVersion = (value: string): number[] =>
      value
        .replace(/^v/, "")
        .split(".")
        .map((part) => Number(part));

    const [leftMajor, leftMinor = 0, leftPatch = 0] = parseVersion(left);
    const [rightMajor, rightMinor = 0, rightPatch = 0] = parseVersion(right);

    return (
      leftMajor - rightMajor ||
      leftMinor - rightMinor ||
      leftPatch - rightPatch
    );
  });

export async function importTerraformModules(
  context: ImportContext,
  repoName: string,
): Promise<void> {
  const fullName = `${context.organization}/${repoName}`;
  console.log(`  Scanning Terraform modules for ${fullName} (terrawiz)...`);

  let output: TerrawizOutput = { modules: [] };
  const temporaryFilePath = path.join(
    os.tmpdir(),
    `terrawiz-${repoName}-${Date.now()}.json`,
  );

  try {
    execSync(
      `npx --yes terrawiz scan github:${fullName} -f json -e ${temporaryFilePath}`,
      {
        env: { ...process.env },
        timeout: 5 * 60 * 1000,
        maxBuffer: 50 * 1024 * 1024,
        stdio: "pipe",
      },
    );

    output = parseTerrawizOutput(
      JSON.parse(fs.readFileSync(temporaryFilePath, "utf-8")),
    );
  } catch (error) {
    console.log(`    ⚠ terrawiz failed for ${fullName}: ${error}`);
    return;
  } finally {
    try {
      fs.unlinkSync(temporaryFilePath);
    } catch {
      // Preserve cleanup best-effort behavior for the temporary terrawiz snapshot.
    }
  }

  const modules = output.modules ?? [];
  if (modules.length === 0) {
    console.log(`    ⚠ No Terraform modules found in ${fullName}`);
    return;
  }

  await context.db.execute(
    sql`DELETE FROM terraform_modules WHERE repository = ${fullName}`,
  );

  let importedCount = 0;
  for (const moduleUsage of modules) {
    await context.db
      .insert(schema.terraformModules)
      .values({
        repository: fullName,
        module: moduleUsage.source,
        filePath: moduleUsage.filePath || null,
        version: moduleUsage.version || null,
      })
      .onConflictDoNothing();

    importedCount += 1;
  }

  console.log(
    `    ✓ ${importedCount} Terraform modules imported for ${fullName}`,
  );
}

export async function importTerraformRegistryReleases(
  context: ImportContext,
): Promise<void> {
  console.log("  Importing Terraform registry releases...");

  const namespace = "pagopa-dx";
  const apiBaseUrl = "https://registry.terraform.io/v1";

  try {
    const allModules: TerraformRegistryModule[] = [];
    let nextUrl: string | null = `${apiBaseUrl}/modules/${namespace}`;
    while (nextUrl) {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const page = parseRegistryModulesPage(await response.json());
      allModules.push(...page.modules);
      nextUrl = page.nextUrl;
      if (nextUrl) {
        await sleep(100);
      }
    }

    let totalImportedCount = 0;
    for (const moduleDefinition of allModules) {
      const versionsResponse = await fetch(
        `${apiBaseUrl}/modules/${moduleDefinition.namespace}/${moduleDefinition.name}/${moduleDefinition.provider}/versions`,
      );
      if (!versionsResponse.ok) {
        continue;
      }

      const sortedVersions = sortVersions(
        parseRegistryVersions(await versionsResponse.json()),
      );

      const firstVersionByMajor = new Map<number, string>();
      for (const version of sortedVersions) {
        const match = version.match(/^v?(\d+)\./);
        if (!match) {
          continue;
        }

        const majorVersion = Number.parseInt(match[1], 10);
        if (!firstVersionByMajor.has(majorVersion)) {
          firstVersionByMajor.set(majorVersion, version);
        }
      }

      for (const [majorVersion, firstReleaseVersion] of firstVersionByMajor) {
        const detailResponse = await fetch(
          `${apiBaseUrl}/modules/${moduleDefinition.namespace}/${moduleDefinition.name}/${moduleDefinition.provider}/${firstReleaseVersion}`,
        );
        if (!detailResponse.ok) {
          continue;
        }

        const publishedAt = parsePublishedAt(await detailResponse.json());
        if (!publishedAt) {
          continue;
        }

        const versionsForMajor = sortedVersions.filter((version) => {
          const match = version.match(/^v?(\d+)\./);
          return match && Number.parseInt(match[1], 10) === majorVersion;
        });

        const releasesCount = versionsForMajor.length;
        const latestVersion =
          versionsForMajor[versionsForMajor.length - 1] ?? firstReleaseVersion;

        await context.db
          .insert(schema.terraformRegistryReleases)
          .values({
            moduleName: moduleDefinition.name,
            provider: moduleDefinition.provider,
            majorVersion,
            firstReleaseVersion,
            releaseDate: publishedAt,
            releasesCount,
            latestVersion,
          })
          .onConflictDoUpdate({
            target: [
              schema.terraformRegistryReleases.moduleName,
              schema.terraformRegistryReleases.provider,
              schema.terraformRegistryReleases.majorVersion,
            ],
            set: {
              releasesCount,
              latestVersion,
            },
          });

        totalImportedCount += 1;
        await sleep(100);
      }
    }

    console.log(`    ✓ ${totalImportedCount} registry releases`);
  } catch (error) {
    console.log(`    ⚠ Registry import failed: ${error}`);
  }
}
