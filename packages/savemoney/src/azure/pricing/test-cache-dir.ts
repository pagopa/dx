import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_CACHE_PARENT = join(
  process.cwd(),
  "node_modules",
  ".cache",
  "dx-savemoney-tests",
);

export async function makeTestCacheDir(prefix: string): Promise<string> {
  await mkdir(TEST_CACHE_PARENT, { recursive: true });
  return mkdtemp(join(TEST_CACHE_PARENT, `${prefix}-`));
}

export async function removeTestCacheDir(dir: string): Promise<void> {
  await rm(dir, { force: true, recursive: true });
}
