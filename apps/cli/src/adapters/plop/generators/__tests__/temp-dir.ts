/**
 * Temp directory helpers for Plop generator integration tests.
 */
import * as fs from "node:fs/promises";

export const shouldKeepTestArtifacts = (env: NodeJS.ProcessEnv): boolean =>
  env.DX_TEST_KEEP_ARTIFACTS === "1" || env.DX_TEST_KEEP_ARTIFACTS === "true";

export const cleanupTempDir = async (
  tmpDir: string,
  keepArtifacts: boolean,
): Promise<void> => {
  if (keepArtifacts) {
    console.info(`Keeping test artifacts at ${tmpDir}`);
    return;
  }

  await fs.rm(tmpDir, { force: true, recursive: true });
};
