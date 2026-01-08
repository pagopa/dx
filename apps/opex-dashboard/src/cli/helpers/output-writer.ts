/**
 * Output writer helper.
 * Handles writing dashboard output to stdout or filesystem.
 */

import { mkdir } from "fs/promises";

import { FileError } from "../../core/errors/index.js";

/**
 * Ensure directory exists, creating it if necessary.
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileError(
      `Failed to create directory ${dirPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Get output directory path for packaged templates.
 */
export function getPackageOutputPath(baseDir: string): string {
  return baseDir;
}

/**
 * Write output to stdout.
 */
export function writeToStdout(content: string): void {
  process.stdout.write(content);
}
