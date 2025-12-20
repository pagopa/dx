/**
 * Spec downloader helper.
 * Downloads OpenAPI specs from HTTP URLs to temporary files.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Clean up temporary spec file.
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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

  // Create temp file
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `opex-spec-${Date.now()}.yaml`);

  fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

  return tempFile;
}
