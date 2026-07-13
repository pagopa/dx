/**
 * Tests for analyzeAppServicePlan() pricing enrichment.
 */

import type { GenericResource } from "@azure/arm-resources";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonitorClientLike } from "../../utils.js";
import type { AppServicePlanClientLike } from "../app-service.js";

import { DEFAULT_THRESHOLDS } from "../../../types.js";

vi.mock("../../utils.js", () => ({
  getMetric: vi.fn(),
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

import { getMetric } from "../../utils.js";
import { analyzeAppServicePlan } from "../app-service.js";

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/serverfarms/plan1",
  location: "westeurope",
  name: "plan1",
  type: "Microsoft.Web/serverfarms",
};

const mockGetMetric = vi.mocked(getMetric);

function makeMonitorClient() {
  return {
    metrics: { list: vi.fn() },
  } satisfies MonitorClientLike;
}

function makePricingService() {
  return {
    resolveAppServicePlan: vi.fn().mockResolvedValue({
      amount: 121.72,
      currency: "EUR",
    }),
  };
}

function makeWebSiteClient(planDetails: {
  numberOfSites?: number;
  reserved?: boolean;
  sku?: {
    capacity?: number;
    name?: string;
    tier?: string;
  };
}) {
  const client = {
    appServicePlans: {
      get: vi.fn().mockResolvedValue({
        location: "westeurope",
        ...planDetails,
      }),
    },
  } satisfies AppServicePlanClientLike;
  return client;
}

describe("analyzeAppServicePlan", () => {
  beforeEach(() => {
    mockGetMetric.mockReset();
    mockGetMetric.mockResolvedValue(50);
  });

  it("enriches suspected unused plans with App Service Plan pricing", async () => {
    const pricing = makePricingService();

    const result = await analyzeAppServicePlan(
      RESOURCE,
      makeWebSiteClient({
        numberOfSites: 0,
        reserved: true,
        sku: {
          capacity: 2,
          name: "S1",
          tier: "Standard",
        },
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.estimatedMonthlySavings).toEqual({
      amount: 121.72,
      currency: "EUR",
    });
    expect(pricing.resolveAppServicePlan).toHaveBeenCalledWith({
      armRegionName: "westeurope",
      os: "linux",
      skuName: "S1",
      workerCount: 2,
    });
  });

  it("does not price Premium underutilization as full removable cost", async () => {
    mockGetMetric.mockResolvedValue(1);
    const pricing = makePricingService();

    const result = await analyzeAppServicePlan(
      RESOURCE,
      makeWebSiteClient({
        numberOfSites: 2,
        reserved: false,
        sku: {
          capacity: 3,
          name: "P1v3",
          tier: "PremiumV3",
        },
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.suspectedUnused).toBe(true);
    expect(result.reason).toContain(
      "Premium tier with low resource utilization",
    );
    expect(result.estimatedMonthlySavings).toBeUndefined();
    expect(pricing.resolveAppServicePlan).not.toHaveBeenCalled();
  });

  it("does not treat missing site count as an empty plan", async () => {
    mockGetMetric.mockResolvedValue(50);
    const pricing = makePricingService();

    const result = await analyzeAppServicePlan(
      RESOURCE,
      makeWebSiteClient({
        reserved: true,
        sku: {
          capacity: 2,
          name: "S1",
          tier: "Standard",
        },
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.suspectedUnused).toBe(false);
    expect(result.estimatedMonthlySavings).toBeUndefined();
    expect(pricing.resolveAppServicePlan).not.toHaveBeenCalled();
  });
});
