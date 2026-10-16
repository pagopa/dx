/**
 * Tests for analyzeStorageAccount() — verifies that custom thresholds
 * actually change the analysis outcome.
 *
 * Key scenario:
 *   - Metric: 30 avg transactions/day
 *   - Default threshold: 10  → 30 >= 10 → NOT flagged
 *   - Custom threshold:  50  → 30 <  50 → IS  flagged   ✓ proves the feature works
 */

import type { MonitorClient } from "@azure/arm-monitor";
import type { GenericResource } from "@azure/arm-resources";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Thresholds } from "../../../types.js";

import { DEFAULT_THRESHOLDS } from "../../../types.js";

// Mock the utils module so we control getMetric without real Azure calls
vi.mock("../../utils.js", () => ({
  getMetric: vi.fn(),
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

// Import after vi.mock so the module resolves the mock
import { getMetric } from "../../utils.js";
import { analyzeStorageAccount } from "../storage.js";

// ── helpers ────────────────────────────────────────────────────────────────

// Minimal stub: analyzeStorageAccount only needs monitorClient to be passed
// through to getMetric, which is fully mocked. We provide only the shape that
// TypeScript requires without unsafe type assertions.
const FAKE_CLIENT = {
  metrics: { list: vi.fn() },
} as unknown as MonitorClient;

const FAKE_RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/st1",
  name: "st1",
  type: "Microsoft.Storage/storageAccounts",
};

const mockGetMetric = vi.mocked(getMetric);

// ── tests ──────────────────────────────────────────────────────────────────

describe("analyzeStorageAccount — threshold sensitivity", () => {
  beforeEach(() => {
    mockGetMetric.mockReset();
  });

  describe("with DEFAULT threshold (transactionsPerDay = 10)", () => {
    it("does NOT flag a resource with 30 transactions/day (900 total over 30 days)", async () => {
      mockGetMetric.mockResolvedValue(900);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      expect(result.suspectedUnused).toBe(false);
    });

    it("flags a resource with 5 transactions/day (150 total over 30 days)", async () => {
      mockGetMetric.mockResolvedValue(150);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      expect(result.suspectedUnused).toBe(true);
    });

    it("does not flag when metric is exactly at the threshold (300 total = 10/day)", async () => {
      mockGetMetric.mockResolvedValue(300);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      // 10 < 10 is false → not flagged
      expect(result.suspectedUnused).toBe(false);
    });
  });

  describe("with CUSTOM threshold (transactionsPerDay = 50)", () => {
    const customThresholds: Thresholds = {
      ...DEFAULT_THRESHOLDS,
      storage: { transactionsPerDay: 50 },
    };

    it("DOES flag a resource with 30 transactions/day (900 total = 30/day < 50) — proves override works", async () => {
      mockGetMetric.mockResolvedValue(900);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        customThresholds,
      );

      expect(result.suspectedUnused).toBe(true);
    });

    it("does NOT flag a resource with 60 transactions/day (1800 total = 60/day ≥ 50)", async () => {
      mockGetMetric.mockResolvedValue(1800);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        customThresholds,
      );

      expect(result.suspectedUnused).toBe(false);
    });

    it("flags at threshold boundary (1470 total = 49/day < 50)", async () => {
      mockGetMetric.mockResolvedValue(1470);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        customThresholds,
      );

      expect(result.suspectedUnused).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns suspectedUnused: false when metric is null (data unavailable)", async () => {
      mockGetMetric.mockResolvedValue(null);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      expect(result.suspectedUnused).toBe(false);
    });

    it("returns suspectedUnused: false when resource id is missing", async () => {
      const resourceWithoutId = { ...FAKE_RESOURCE, id: undefined };

      const result = await analyzeStorageAccount(
        resourceWithoutId,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      expect(result.suspectedUnused).toBe(false);
      expect(mockGetMetric).not.toHaveBeenCalled();
    });

    it("applies default thresholds when the parameter is omitted", async () => {
      // 150 total over 30 days = 5/day < DEFAULT 10 → flagged even without explicit thresholds argument
      mockGetMetric.mockResolvedValue(150);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
      );

      expect(result.suspectedUnused).toBe(true);
    });

    it("requests Total aggregation and reports a per-day average", async () => {
      mockGetMetric.mockResolvedValue(30);

      const result = await analyzeStorageAccount(
        FAKE_RESOURCE,
        FAKE_CLIENT,
        30,
        DEFAULT_THRESHOLDS,
      );

      expect(mockGetMetric).toHaveBeenCalledWith(
        FAKE_CLIENT,
        FAKE_RESOURCE.id,
        "Transactions",
        "Total",
        30,
        undefined,
      );
      expect(result.reason).toContain(
        "Very low transaction count (1.00 avg/day)",
      );
      expect(result.suspectedUnused).toBe(true);
    });
  });
});
