/**
 * Tests for the Public IP Retail Prices resolver.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../client.js";
import type { PricingResponse } from "../schema.js";

import { DiskCache } from "../cache.js";
import { PricingClient } from "../client.js";
import { makeTestCacheDir, removeTestCacheDir } from "../test-cache-dir.js";
import { resolvePublicIpMonthlyPrice } from "./public-ip.js";
import { HOURS_PER_MONTH } from "./vm.js";

function makeFetch(body: PricingResponse): FetchLike {
  return vi.fn<FetchLike>().mockResolvedValue({
    json: async () => body as unknown,
    ok: true,
    status: 200,
    statusText: "OK",
  });
}

let dir: string;

beforeEach(async () => {
  dir = await makeTestCacheDir("public-ip-resolver");
});

afterEach(async () => {
  await removeTestCacheDir(dir);
});

describe("resolvePublicIpMonthlyPrice", () => {
  it("returns the monthly cost of a Standard static Public IP", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "Standard Static IP Address",
          productName: "Virtual Network",
          retailPrice: 0.004,
          skuName: "Standard",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.004,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolvePublicIpMonthlyPrice(client, {
      allocation: "static",
      armRegionName: "westeurope",
      sku: "standard",
    });

    expect(money).toEqual({
      amount: Math.round(0.004 * HOURS_PER_MONTH * 100) / 100,
      currency: "EUR",
    });
  });

  it("filters by allocation token in meterName", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "Basic Dynamic IP Address",
          productName: "Virtual Network",
          retailPrice: 0.0036,
          skuName: "Basic",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.0036,
        },
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "Basic Static IP Address",
          productName: "Virtual Network",
          retailPrice: 0.0036,
          skuName: "Basic",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.0036,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolvePublicIpMonthlyPrice(client, {
      allocation: "dynamic",
      armRegionName: "westeurope",
      sku: "basic",
    });

    expect(money?.amount).toBeCloseTo(0.0036 * HOURS_PER_MONTH, 2);
  });

  it("returns undefined when no meter matches", async () => {
    const body: PricingResponse = {
      Items: [],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolvePublicIpMonthlyPrice(client, {
      allocation: "static",
      armRegionName: "westeurope",
      sku: "standard",
    });

    expect(money).toBeUndefined();
  });
});
