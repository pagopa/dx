/**
 * Tests for the Managed Disk Retail Prices resolver.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../../client.js";
import type { PricingResponse } from "../../schema.js";

import { DiskCache } from "../../cache.js";
import { PricingClient } from "../../client.js";
import { makeTestCacheDir, removeTestCacheDir } from "../../test-cache-dir.js";
import { pickTier, resolveDiskMonthlyPrice } from "../disk.js";

function makeFetch(body: PricingResponse): {
  fetch: FetchLike;
  spy: ReturnType<typeof vi.fn>;
} {
  const spy = vi.fn<FetchLike>().mockResolvedValue({
    json: async () => body,
    ok: true,
    status: 200,
    statusText: "OK",
  });
  return { fetch: spy, spy };
}

let dir: string;

beforeEach(async () => {
  dir = await makeTestCacheDir("disk-resolver");
});

afterEach(async () => {
  await removeTestCacheDir(dir);
});

describe("pickTier", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [128, 10],
    [129, 15],
    [1024, 30],
    [32768, 80],
  ])("maps %i GiB to tier %i", (sizeGiB, tier) => {
    expect(pickTier(sizeGiB)).toBe(tier);
  });

  it("returns undefined for sizes above the largest tier", () => {
    expect(pickTier(32769)).toBeUndefined();
  });
});

describe("resolveDiskMonthlyPrice", () => {
  it("resolves the monthly price for a Premium_LRS P10 disk", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "P10 LRS Disk",
          productName: "Premium SSD Managed Disks",
          retailPrice: 19.71,
          skuName: "P10 LRS",
          type: "Consumption",
          unitOfMeasure: "1/Month",
          unitPrice: 19.71,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });

    const money = await resolveDiskMonthlyPrice(client, {
      armRegionName: "westeurope",
      diskSizeGiB: 128,
      sku: "Premium_LRS",
    });

    expect(money).toEqual({ amount: 19.71, currency: "EUR" });
    expect(spy).toHaveBeenCalledTimes(1);
    // The OData filter must target the tier-derived skuName, not the raw
    // managed-disk SKU. URLSearchParams encodes spaces as `+`.
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain("skuName+eq+%27P10+LRS%27");
    expect(url).toContain("productName+eq+%27Premium+SSD+Managed+Disks%27");
  });

  it("uses the ZRS product/replication for Premium_ZRS", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "P10 ZRS Disk",
          productName: "Premium SSD Managed Disks",
          retailPrice: 24.64,
          skuName: "P10 ZRS",
          type: "Consumption",
          unitOfMeasure: "1/Month",
          unitPrice: 24.64,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });

    const money = await resolveDiskMonthlyPrice(client, {
      armRegionName: "westeurope",
      diskSizeGiB: 128,
      sku: "Premium_ZRS",
    });

    expect(money).toEqual({ amount: 24.64, currency: "EUR" });
    const url = String(spy.mock.calls[0]?.[0]);
    expect(url).toContain("skuName+eq+%27P10+ZRS%27");
  });

  it("returns undefined when the response has no matching entry", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          // Per-GB-month item; resolver must skip it because of unitOfMeasure.
          productName: "Premium SSD Managed Disks",
          retailPrice: 0.1,
          skuName: "P10 LRS",
          type: "Consumption",
          unitOfMeasure: "1 GB/Month",
          unitPrice: 0.1,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body).fetch,
    });

    const money = await resolveDiskMonthlyPrice(client, {
      armRegionName: "westeurope",
      diskSizeGiB: 128,
      sku: "Premium_LRS",
    });

    expect(money).toBeUndefined();
  });

  it("returns undefined when the disk size exceeds the largest tier", async () => {
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: vi.fn<FetchLike>(),
    });

    const money = await resolveDiskMonthlyPrice(client, {
      armRegionName: "westeurope",
      diskSizeGiB: 100_000,
      sku: "Premium_LRS",
    });

    expect(money).toBeUndefined();
  });

  it("rejects invalid input via zod", async () => {
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: vi.fn<FetchLike>(),
    });

    await expect(
      resolveDiskMonthlyPrice(client, {
        armRegionName: "westeurope",
        diskSizeGiB: -1,
        sku: "Premium_LRS",
      }),
    ).rejects.toThrow();
  });
});
