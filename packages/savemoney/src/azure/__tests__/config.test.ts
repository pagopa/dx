/**
 * Tests for loadThresholds() — verifies that:
 * 1. Returns DEFAULT_THRESHOLDS when no file is found.
 * 2. Loads and deep-merges user overrides from an explicit file path.
 * 3. Partial overrides keep defaults for non-overridden fields.
 * 4. Falls back to defaults for a non-existent path (no throw).
 * 5. The actual .savemoneyrc.json at the dx root is correctly loaded.
 */

import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { DEFAULT_THRESHOLDS } from "../../types.js";
import { loadThresholds } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute paths used in tests */
const FIXTURE_PARTIAL = path.resolve(
  __dirname,
  "fixtures/partial-override.json",
);
/** The .savemoneyrc.json at the dx workspace root (4 levels up from this file) */
const DX_ROOT_RC = path.resolve(__dirname, "../../../../../.savemoneyrc.json");

describe("loadThresholds", () => {
  it("returns DEFAULT_THRESHOLDS when explicit path does not exist", async () => {
    const result = await loadThresholds("/nonexistent/.savemoneyrc.json");
    expect(result).toEqual(DEFAULT_THRESHOLDS);
  });

  it("loads partial overrides from an explicit file and keeps defaults for missing fields", async () => {
    // partial-override.json overrides vm.cpuPercent (5) and storage.transactionsPerDay (50)
    const result = await loadThresholds(FIXTURE_PARTIAL);

    // Overridden values
    expect(result.vm.cpuPercent).toBe(5);
    expect(result.storage.transactionsPerDay).toBe(50);

    // Non-overridden vm field keeps default
    expect(result.vm.networkInBytesPerDay).toBe(
      DEFAULT_THRESHOLDS.vm.networkInBytesPerDay,
    );

    // Entire non-overridden sections keep defaults
    expect(result.appService).toEqual(DEFAULT_THRESHOLDS.appService);
    expect(result.containerApp).toEqual(DEFAULT_THRESHOLDS.containerApp);
    expect(result.publicIp).toEqual(DEFAULT_THRESHOLDS.publicIp);
    expect(result.staticSite).toEqual(DEFAULT_THRESHOLDS.staticSite);
  });

  it("loads the dx root .savemoneyrc.json and all values differ from defaults", async () => {
    const result = await loadThresholds(DX_ROOT_RC);

    // All values in .savemoneyrc.json are intentionally different from the defaults
    expect(result.vm.cpuPercent).toBe(5);
    expect(result.vm.networkInBytesPerDay).toBe(10485760);
    expect(result.appService.cpuPercent).toBe(10);
    expect(result.appService.memoryPercent).toBe(20);
    expect(result.appService.premiumCpuPercent).toBe(15);
    expect(result.containerApp.cpuNanoCores).toBe(5000000);
    expect(result.containerApp.memoryBytes).toBe(52428800);
    expect(result.containerApp.networkBytes).toBe(100000);
    expect(result.storage.transactionsPerDay).toBe(50);
    expect(result.publicIp.bytesInDDoS).toBe(1048576);
    expect(result.staticSite.siteHits).toBe(500);
    expect(result.staticSite.bytesSent).toBe(5242880);

    // Sanity: the values are indeed different from the defaults
    expect(result.vm.cpuPercent).not.toBe(DEFAULT_THRESHOLDS.vm.cpuPercent);
    expect(result.storage.transactionsPerDay).not.toBe(
      DEFAULT_THRESHOLDS.storage.transactionsPerDay,
    );
  });

  it("overrides only the specified nested fields, leaving others at default", async () => {
    // partial-override.json only sets vm.cpuPercent — vm.networkInBytesPerDay stays default
    const result = await loadThresholds(FIXTURE_PARTIAL);
    expect(result.vm.cpuPercent).toBe(5);
    expect(result.vm.networkInBytesPerDay).toBe(
      DEFAULT_THRESHOLDS.vm.networkInBytesPerDay,
    );
  });

  it("returns a complete Thresholds object (all required keys present)", async () => {
    const result = await loadThresholds(FIXTURE_PARTIAL);
    expect(result).toHaveProperty("vm");
    expect(result).toHaveProperty("appService");
    expect(result).toHaveProperty("containerApp");
    expect(result).toHaveProperty("storage");
    expect(result).toHaveProperty("publicIp");
    expect(result).toHaveProperty("staticSite");
  });
});
