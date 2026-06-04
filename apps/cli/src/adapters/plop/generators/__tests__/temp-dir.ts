/**
 * Temp directory helpers for Plop generator integration tests.
 */
import fs from "node:fs/promises";
import path from "node:path";

export const cleanupTempDir = async (tmpDir: string): Promise<void> => {
  await fs.rm(tmpDir, { force: true, recursive: true });
};

const readGeneratedFile = async (
  rootDir: string,
  filePath: string,
): Promise<[string, string]> => [
  filePath,
  await fs.readFile(path.join(rootDir, filePath), "utf-8"),
];

export const readGeneratedFiles = async (
  rootDir: string,
  filePaths: readonly string[],
): Promise<Record<string, string>> =>
  Object.fromEntries(
    await Promise.all(
      filePaths.map((filePath) => readGeneratedFile(rootDir, filePath)),
    ),
  );
