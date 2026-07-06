/**
 * Tests for analyzePublicIp() pricing enrichment.
 */

import type { GenericResource } from "@azure/arm-resources";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonitorClientLike } from "../../utils.js";
import type { PublicIpNetworkClientLike } from "../public-ip.js";

import { DEFAULT_THRESHOLDS } from "../../../types.js";

vi.mock("../../utils.js", () => ({
  getMetric: vi.fn(),
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

import { getMetric } from "../../utils.js";
import { analyzePublicIp } from "../public-ip.js";

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/publicIPAddresses/pip1",
  location: "westeurope",
  name: "pip1",
  type: "Microsoft.Network/publicIPAddresses",
};

const mockGetMetric = vi.mocked(getMetric);

function makeMonitorClient(): MonitorClientLike {
  return {
    metrics: { list: vi.fn() },
  };
}

function makeNetworkClient(
  publicIp: Awaited<
    ReturnType<PublicIpNetworkClientLike["publicIPAddresses"]["get"]>
  >,
): PublicIpNetworkClientLike {
  return {
    publicIPAddresses: {
      get: vi.fn().mockResolvedValue(publicIp),
    },
  };
}

function makePricingService() {
  return {
    resolvePublicIp: vi.fn().mockResolvedValue({
      amount: 3.65,
      currency: "EUR",
    }),
  };
}

describe("analyzePublicIp", () => {
  beforeEach(() => {
    mockGetMetric.mockReset();
    mockGetMetric.mockResolvedValue(500_000);
  });

  it("enriches suspected unused Public IPs with normalized pricing input", async () => {
    const pricing = makePricingService();

    const result = await analyzePublicIp(
      RESOURCE,
      makeNetworkClient({
        location: "westeurope",
        publicIPAllocationMethod: "Static",
        sku: { name: "Standard" },
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.estimatedMonthlyCostAtRisk).toEqual({
      amount: 3.65,
      currency: "EUR",
    });
    expect(pricing.resolvePublicIp).toHaveBeenCalledWith({
      allocation: "static",
      armRegionName: "westeurope",
      sku: "standard",
    });
  });

  it("does not call pricing when the Public IP is not suspected unused", async () => {
    const pricing = makePricingService();

    const result = await analyzePublicIp(
      RESOURCE,
      makeNetworkClient({
        ipConfiguration: { id: "nic-config" },
        location: "westeurope",
        publicIPAllocationMethod: "Static",
        sku: { name: "Standard" },
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.suspectedUnused).toBe(false);
    expect(result.estimatedMonthlyCostAtRisk).toBeUndefined();
    expect(pricing.resolvePublicIp).not.toHaveBeenCalled();
  });

  it("does not call pricing when Public IP details are missing", async () => {
    const pricing = makePricingService();

    await analyzePublicIp(
      RESOURCE,
      makeNetworkClient({
        location: "westeurope",
      }),
      makeMonitorClient(),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(pricing.resolvePublicIp).not.toHaveBeenCalled();
  });
});
