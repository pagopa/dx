/**
 * Spec downloader helper.
 * Downloads OpenAPI specs from HTTP URLs to temporary files.
 */

import { access, unlink, writeFile } from "fs/promises";
import tmp from "tmp";

import { FileError } from "../../core/errors/index.js";

/**
 * Clean up temporary spec file.
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
    await unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Download OA3 spec from HTTP URL to a temporary file.
 * Returns the path to the temporary file.
 */
export async function downloadSpec(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download spec: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  // Create secure temp file
  const tempFile = tmp.fileSync({
    postfix: ".yaml",
    prefix: "opex-spec-",
  }).name;

  try {
    await writeFile(tempFile, Buffer.from(arrayBuffer));
  } catch (error) {
    throw new FileError(
      `Failed to write spec to ${tempFile}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return tempFile;
}
