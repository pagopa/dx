/**
 * Tests for the PricingService façade — covers memoization and error
 * swallowing. The underlying resolvers are exercised in their own tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../client.js";
import type { PricingResponse } from "../schema.js";

import { DiskCache } from "../cache.js";
import { PricingClient } from "../client.js";
import { PricingService } from "../pricing-service.js";
import { makeTestCacheDir, removeTestCacheDir } from "../test-cache-dir.js";

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
  dir = await makeTestCacheDir("pricing-service");
});

afterEach(async () => {
  await removeTestCacheDir(dir);
});

describe("PricingService", () => {
  it("memoizes identical VM lookups within the same instance", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          productName: "Virtual Machines BS Series",
          retailPrice: 0.05,
          skuName: "B2s",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.05,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });
    const service = new PricingService(client);

    const [a, b] = await Promise.all([
      service.resolveVm({
        armRegionName: "westeurope",
        armSkuName: "Standard_B2s",
      }),
      service.resolveVm({
        armRegionName: "westeurope",
        armSkuName: "Standard_B2s",
      }),
    ]);

    expect(a).toEqual(b);
    // Only one underlying fetch despite two concurrent calls.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns undefined and does not throw when the resolver errors", async () => {
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: vi.fn<FetchLike>().mockRejectedValue(new Error("boom")),
    });
    const service = new PricingService(client);

    const result = await service.resolveVm({
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
    });

    expect(result).toBeUndefined();
  });

  it("scopes the in-memory memo by os hint", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          productName: "Virtual Machines BS Series",
          retailPrice: 0.05,
          skuName: "B2s",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.05,
        },
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          productName: "Virtual Machines BS Series Windows",
          retailPrice: 0.09,
          skuName: "B2s",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.09,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });
    const service = new PricingService(client);

    const linux = await service.resolveVm({
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
      os: "linux",
    });
    const windows = await service.resolveVm({
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
      os: "windows",
    });

    expect(linux?.amount).toBeLessThan(windows?.amount ?? 0);
    // Same underlying filter, served from DiskCache — one fetch only.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("PricingService disk memoization", () => {
  it("memoizes identical disk lookups within the same instance", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
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
    const service = new PricingService(client);

    const [a, b] = await Promise.all([
      service.resolveDisk({
        armRegionName: "westeurope",
        diskSizeGiB: 128,
        sku: "Premium_LRS",
      }),
      service.resolveDisk({
        armRegionName: "westeurope",
        diskSizeGiB: 128,
        sku: "Premium_LRS",
      }),
    ]);

    expect(a).toEqual(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("memoizes disk lookups with display and ARM region names as the same key", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
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
    const service = new PricingService(client);

    const [a, b] = await Promise.all([
      service.resolveDisk({
        armRegionName: "West Europe",
        diskSizeGiB: 128,
        sku: "Premium_LRS",
      }),
      service.resolveDisk({
        armRegionName: "westeurope",
        diskSizeGiB: 128,
        sku: "Premium_LRS",
      }),
    ]);

    expect(a).toEqual(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("PricingService App Service Plan memoization", () => {
  it("memoizes identical App Service Plan lookups within the same instance", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "S1 App",
          productName: "Azure App Service Standard Plan - Linux",
          retailPrice: 0.08337,
          skuName: "S1",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.08337,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });
    const service = new PricingService(client);

    const [a, b] = await Promise.all([
      service.resolveAppServicePlan({
        armRegionName: "westeurope",
        os: "linux",
        skuName: "S1",
        workerCount: 1,
      }),
      service.resolveAppServicePlan({
        armRegionName: "westeurope",
        os: "linux",
        skuName: "S1",
        workerCount: 1,
      }),
    ]);

    expect(a).toEqual(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("memoizes App Service Plan lookups by canonical region and worker count", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "S1 App",
          productName: "Azure App Service Standard Plan - Linux",
          retailPrice: 0.08337,
          skuName: "S1",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.08337,
        },
      ],
      NextPageLink: null,
    };
    const { fetch, spy } = makeFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch,
    });
    const service = new PricingService(client);

    const [a, b] = await Promise.all([
      service.resolveAppServicePlan({
        armRegionName: "West Europe",
        os: "linux",
        skuName: "S1",
        workerCount: 1.2,
      }),
      service.resolveAppServicePlan({
        armRegionName: "westeurope",
        os: "linux",
        skuName: "S1",
        workerCount: 2,
      }),
    ]);

    expect(a).toEqual(b);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
