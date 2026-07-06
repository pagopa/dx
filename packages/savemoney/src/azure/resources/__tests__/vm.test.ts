/**
 * Tests for analyzeVM() pricing enrichment.
 */

import type { GenericResource } from "@azure/arm-resources";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonitorClientLike } from "../../utils.js";
import type { VMComputeClientLike } from "../vm.js";

import { DEFAULT_THRESHOLDS } from "../../../types.js";

vi.mock("../../utils.js", () => ({
  getMetric: vi.fn(),
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

import { getMetric } from "../../utils.js";
import { analyzeVM } from "../vm.js";

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1",
  location: "westeurope",
  name: "vm1",
  type: "Microsoft.Compute/virtualMachines",
};

const mockGetMetric = vi.mocked(getMetric);

function makeComputeClient(args: {
  location?: string;
  osType?: string;
  powerState?: string;
  vmSize?: string;
}): VMComputeClientLike {
  return {
    virtualMachines: {
      get: vi.fn().mockResolvedValue({
        hardwareProfile: { vmSize: args.vmSize },
        location: args.location,
        storageProfile: { osDisk: { osType: args.osType } },
      }),
      instanceView: vi.fn().mockResolvedValue({
        statuses: [{ code: args.powerState }],
      }),
    },
  };
}

function makeMonitorClient(): MonitorClientLike {
  return {
    metrics: { list: vi.fn() },
  };
}

function makePricingService() {
  return {
    resolveVm: vi.fn().mockResolvedValue({
      amount: 29.94,
      currency: "EUR",
    }),
  };
}

describe("analyzeVM", () => {
  beforeEach(() => {
    mockGetMetric.mockReset();
    mockGetMetric.mockResolvedValue(10_000_000);
  });

  it("enriches stopped VMs with SKU, region, and OS pricing input", async () => {
    const pricing = makePricingService();

    const result = await analyzeVM(
      RESOURCE,
      makeMonitorClient(),
      makeComputeClient({
        location: "westeurope",
        osType: "Windows",
        powerState: "PowerState/stopped",
        vmSize: "Standard_B2s",
      }),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.estimatedMonthlyCostAtRisk).toEqual({
      amount: 29.94,
      currency: "EUR",
    });
    expect(pricing.resolveVm).toHaveBeenCalledWith({
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
      os: "windows",
    });
  });

  it("does not call pricing when the VM is not suspected unused", async () => {
    const pricing = makePricingService();

    const result = await analyzeVM(
      RESOURCE,
      makeMonitorClient(),
      makeComputeClient({
        location: "westeurope",
        osType: "Linux",
        powerState: "PowerState/running",
        vmSize: "Standard_B2s",
      }),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result.suspectedUnused).toBe(false);
    expect(result.estimatedMonthlyCostAtRisk).toBeUndefined();
    expect(pricing.resolveVm).not.toHaveBeenCalled();
  });

  it("leaves the analysis unchanged when pricing lookup fails", async () => {
    const pricing = {
      resolveVm: vi.fn().mockRejectedValue(new Error("pricing unavailable")),
    };

    const result = await analyzeVM(
      RESOURCE,
      makeMonitorClient(),
      makeComputeClient({
        location: "westeurope",
        osType: "Linux",
        powerState: "PowerState/deallocated",
        vmSize: "Standard_B2s",
      }),
      30,
      DEFAULT_THRESHOLDS,
      false,
      undefined,
      pricing,
    );

    expect(result).toEqual({
      costRisk: "high",
      reason: "VM is deallocated. ",
      suspectedUnused: true,
    });
  });
});
