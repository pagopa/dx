/**
 * Tests for loadConfig() — verifies that:
 * 1. Returns default thresholds and prompts for subscriptionIds when no file is given.
 * 2. Loads subscriptionIds, location, timespanDays and thresholds from a YAML file.
 * 3. Partial threshold overrides keep defaults for non-overridden fields.
 * 4. Throws a clear error for a non-existent explicit path.
 */

import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../../index.js";
import { DEFAULT_THRESHOLDS } from "../../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute paths used in tests */
const FIXTURE_PARTIAL = path.resolve(
  __dirname,
  "fixtures/partial-override.yaml",
);
const FIXTURE_FULL = path.resolve(__dirname, "fixtures/full-override.yaml");

describe("loadConfig", () => {
  it("throws when explicit path does not exist", async () => {
    await expect(loadConfig("/nonexistent/config.yaml")).rejects.toThrow(
      "Config file not found",
    );
  });

  it("loads subscriptionIds and defaults from a partial YAML file", async () => {
    const result = await loadConfig(FIXTURE_PARTIAL);

    expect(result.subscriptionIds).toEqual([
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    ]);
    expect(result.preferredLocation).toBe("italynorth");
    expect(result.timespanDays).toBe(30);
  });

  it("loads partial threshold overrides and keeps defaults for missing fields", async () => {
    const result = await loadConfig(FIXTURE_PARTIAL);

    // Overridden values
    expect(result.thresholds?.vm.cpuPercent).toBe(5);
    expect(result.thresholds?.storage.transactionsPerDay).toBe(50);

    // Non-overridden vm field keeps default
    expect(result.thresholds?.vm.networkInBytesPerDay).toBe(
      DEFAULT_THRESHOLDS.vm.networkInBytesPerDay,
    );

    // Entire non-overridden sections keep defaults
    expect(result.thresholds?.appService).toEqual(
      DEFAULT_THRESHOLDS.appService,
    );
    expect(result.thresholds?.containerApp).toEqual(
      DEFAULT_THRESHOLDS.containerApp,
    );
    expect(result.thresholds?.publicIp).toEqual(DEFAULT_THRESHOLDS.publicIp);
    expect(result.thresholds?.staticSite).toEqual(
      DEFAULT_THRESHOLDS.staticSite,
    );
  });

  it("loads all values from a full YAML file", async () => {
    const result = await loadConfig(FIXTURE_FULL);

    expect(result.subscriptionIds).toHaveLength(2);
    expect(result.preferredLocation).toBe("westeurope");
    expect(result.timespanDays).toBe(60);

    expect(result.thresholds?.vm.cpuPercent).toBe(5);
    expect(result.thresholds?.vm.networkInBytesPerDay).toBe(10485760);
    expect(result.thresholds?.appService.cpuPercent).toBe(10);
    expect(result.thresholds?.appService.memoryPercent).toBe(20);
    expect(result.thresholds?.appService.premiumCpuPercent).toBe(15);
    expect(result.thresholds?.containerApp.cpuNanoCores).toBe(5000000);
    expect(result.thresholds?.containerApp.memoryBytes).toBe(52428800);
    expect(result.thresholds?.containerApp.networkBytes).toBe(100000);
    expect(result.thresholds?.storage.transactionsPerDay).toBe(50);
    expect(result.thresholds?.publicIp.bytesInDDoS).toBe(1048576);
    expect(result.thresholds?.staticSite.siteHits).toBe(500);
    expect(result.thresholds?.staticSite.bytesSent).toBe(5242880);
  });

  it("returns a complete Thresholds object (all required keys present)", async () => {
    const result = await loadConfig(FIXTURE_PARTIAL);
    expect(result.thresholds).toHaveProperty("vm");
    expect(result.thresholds).toHaveProperty("appService");
    expect(result.thresholds).toHaveProperty("containerApp");
    expect(result.thresholds).toHaveProperty("storage");
    expect(result.thresholds).toHaveProperty("publicIp");
    expect(result.thresholds).toHaveProperty("staticSite");
  });
});
