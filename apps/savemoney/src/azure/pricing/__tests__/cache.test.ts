/**
 * Tests for the disk-backed pricing cache.
 *
 * Each test uses a freshly-created temp directory so they do not leak
 * state into the developer's real pricing cache.
 */

import { writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DiskCache } from "../cache.js";
import { makeTestCacheDir, removeTestCacheDir } from "../test-cache-dir.js";

describe("DiskCache", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTestCacheDir("cache");
  });
  afterEach(async () => {
    await removeTestCacheDir(dir);
  });

  it("returns undefined on a miss", async () => {
    const cache = new DiskCache({ dir });
    await expect(cache.get("nope")).resolves.toBeUndefined();
  });

  it("returns the value written under the same key", async () => {
    const cache = new DiskCache({ dir });
    await cache.set("hello", { hits: 42 });
    await expect(cache.get("hello")).resolves.toEqual({ hits: 42 });
  });

  it("treats different keys as independent entries", async () => {
    const cache = new DiskCache({ dir });
    await cache.set("a", 1);
    await cache.set("b", 2);
    await expect(cache.get("a")).resolves.toBe(1);
    await expect(cache.get("b")).resolves.toBe(2);
  });

  it("returns undefined once the entry is older than ttlMs", async () => {
    const cache = new DiskCache({ dir, ttlMs: 1 });
    await cache.set("stale", { v: 1 });
    // Wait long enough to outlast the 1 ms TTL.
    await new Promise((resolve) => setTimeout(resolve, 25));
    await expect(cache.get("stale")).resolves.toBeUndefined();
  });

  it("returns undefined when the cache file contains invalid JSON", async () => {
    const cache = new DiskCache({ dir });
    const path = cache.pathFor("broken");
    await writeFile(path, "{not json", "utf8");
    await expect(cache.get("broken")).resolves.toBeUndefined();
  });

  it("derives different paths for different keys", () => {
    const cache = new DiskCache({ dir });
    expect(cache.pathFor("a")).not.toBe(cache.pathFor("b"));
  });

  it("refuses to remove directories outside the test cache parent", async () => {
    await expect(removeTestCacheDir(process.cwd())).rejects.toThrow(
      /non-test cache directory/,
    );
  });
});
