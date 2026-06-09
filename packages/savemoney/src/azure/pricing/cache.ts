/**
 * Disk-backed cache for Azure Retail Prices API responses.
 *
 * Retail prices change rarely (Azure publishes a new snapshot at most once
 * a month) so a long TTL is safe and dramatically cuts cold-start latency
 * for `dx savemoney`. Each cache entry is a JSON file whose name is the
 * SHA-256 of the request key (the OData `$filter` string); the entry is
 * considered fresh while `now - mtime <= ttl`.
 *
 * The cache directory is created lazily on first write. Read/write
 * failures never throw: a corrupted or unreadable entry simply behaves
 * like a miss so the caller refetches from the API. This matches the
 * "best-effort cache" semantics expected by HTTP-level caches.
 */

import { createHash } from "node:crypto";
import { mkdir, open, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Defaults documented in the package README. */
export const DEFAULT_CACHE_DIR = join(
  process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
  "dx-savemoney",
  "pricing",
);
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type DiskCacheOptions = {
  /** Absolute path where cache entries are stored. */
  dir?: string;
  /** Maximum age of an entry before it is treated as a miss. */
  ttlMs?: number;
};

/**
 * Best-effort JSON cache. Keys are arbitrary strings; values are anything
 * serialisable via `JSON.stringify`.
 */
export class DiskCache {
  readonly dir: string;
  readonly ttlMs: number;

  constructor(options: DiskCacheOptions = {}) {
    this.dir = options.dir ?? DEFAULT_CACHE_DIR;
    this.ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Returns the cached value for `key` if present and still fresh.
   * Returns `undefined` on miss, expiry, or any I/O / parse error.
   */
  async get<T>(key: string): Promise<T | undefined> {
    const path = this.pathFor(key);
    try {
      const file = await open(path, "r");
      try {
        const stats = await file.stat();
        if (Date.now() - stats.mtimeMs > this.ttlMs) return undefined;
        const raw = await file.readFile("utf8");
        return JSON.parse(raw) as T;
      } finally {
        await file.close();
      }
    } catch {
      return undefined;
    }
  }

  /** Absolute filesystem path used to store `key`. Exposed for tests. */
  pathFor(key: string): string {
    const hash = createHash("sha256").update(key).digest("hex");
    return join(this.dir, `${hash}.json`);
  }

  /**
   * Persists `value` under `key`. Silently swallows write errors so a
   * read-only filesystem cannot break the calling pipeline.
   */
  async set<T>(key: string, value: T): Promise<void> {
    const path = this.pathFor(key);
    try {
      await mkdir(this.dir, { mode: 0o700, recursive: true });
      await writeFile(path, JSON.stringify(value), {
        encoding: "utf8",
        mode: 0o600,
      });
    } catch {
      // Best-effort: cache failures must not surface to callers.
    }
  }
}
