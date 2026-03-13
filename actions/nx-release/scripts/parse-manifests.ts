/**
 * Shared manifest parsing helpers used by build-pr-body.
 */
import { readFile } from "node:fs/promises";

/** Base fields extracted from any manifest file. */
export interface ManifestBase {
  name: string;
  version: string;
}

/**
 * Reads and validates name/version from a package.json file.
 * Returns null when the file is missing or cannot be parsed.
 */
export async function readPackageJson(
  filePath: string,
): Promise<(ManifestBase & { raw: Record<string, unknown> }) | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const pkg = parsed as Record<string, unknown>;
    if (typeof pkg["name"] !== "string" || typeof pkg["version"] !== "string") {
      return null;
    }
    return { name: pkg["name"], raw: pkg, version: pkg["version"] };
  } catch {
    return null;
  }
}

/**
 * Reads and validates artifact name/version from a Maven pom.xml file.
 * Returns null when the file is missing or fields cannot be found.
 */
export async function readPomXml(
  filePath: string,
): Promise<ManifestBase | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const name =
      raw.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1]?.trim() ?? "";
    const version = raw.match(/<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "";
    if (!name || !version) {
      return null;
    }
    return { name, version };
  } catch {
    return null;
  }
}
