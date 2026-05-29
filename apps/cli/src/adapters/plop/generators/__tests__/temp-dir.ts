/**
 * Temp directory helpers for Plop generator integration tests.
 */
import fs from "node:fs/promises";

export const cleanupTempDir = async (tmpDir: string): Promise<void> => {
  await fs.rm(tmpDir, { force: true, recursive: true });
};
