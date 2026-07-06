/**
 * Tests for analyzeDisk() pricing enrichment.
 */

import type { Disk } from "@azure/arm-compute";
import type { GenericResource } from "@azure/arm-resources";

import { describe, expect, it, vi } from "vitest";

import type { DiskComputeClientLike } from "../disk.js";

import { analyzeDisk } from "../disk.js";

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/disks/disk1",
  location: "westeurope",
  name: "disk1",
  type: "Microsoft.Compute/disks",
};

function makeComputeClient(disk: Disk): DiskComputeClientLike {
  return {
    disks: {
      get: vi.fn().mockResolvedValue(disk),
    },
  };
}

function makePricingService() {
  return {
    resolveDisk: vi.fn().mockResolvedValue({
      amount: 8.2,
      currency: "EUR",
    }),
  };
}

describe("analyzeDisk", () => {
  it("enriches unattached disks with supported SKU pricing", async () => {
    const pricing = makePricingService();

    const result = await analyzeDisk(
      RESOURCE,
      makeComputeClient({
        diskSizeGB: 64,
        diskState: "Unattached",
        location: "westeurope",
        sku: { name: "StandardSSD_LRS" },
      }),
      false,
      pricing,
    );

    expect(result.estimatedMonthlyCostAtRisk).toEqual({
      amount: 8.2,
      currency: "EUR",
    });
    expect(pricing.resolveDisk).toHaveBeenCalledWith({
      armRegionName: "westeurope",
      diskSizeGiB: 64,
      sku: "StandardSSD_LRS",
    });
  });

  it("does not call pricing when the disk SKU is unsupported", async () => {
    const pricing = makePricingService();

    const result = await analyzeDisk(
      RESOURCE,
      makeComputeClient({
        diskSizeGB: 64,
        diskState: "Unattached",
        location: "westeurope",
        sku: { name: "UltraSSD_LRS" },
      }),
      false,
      pricing,
    );

    expect(result.suspectedUnused).toBe(true);
    expect(result.estimatedMonthlyCostAtRisk).toBeUndefined();
    expect(pricing.resolveDisk).not.toHaveBeenCalled();
  });

  it("does not call pricing when required disk fields are missing", async () => {
    const pricing = makePricingService();

    const result = await analyzeDisk(
      RESOURCE,
      makeComputeClient({
        diskState: "Unattached",
        location: "westeurope",
        sku: { name: "StandardSSD_LRS" },
      }),
      false,
      pricing,
    );

    expect(result.suspectedUnused).toBe(true);
    expect(result.estimatedMonthlyCostAtRisk).toBeUndefined();
    expect(pricing.resolveDisk).not.toHaveBeenCalled();
  });
});
