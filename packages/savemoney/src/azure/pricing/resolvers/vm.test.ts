/**
 * Tests for the VM Retail Prices resolver.
 *
 * The Retail Prices API is mocked via the `FetchLike` indirection so the
 * tests run hermetically. Fixtures live next to the tests to keep the
 * surface explicit.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../client.js";
import type { PricingResponse } from "../schema.js";

import { DiskCache } from "../cache.js";
import { PricingClient } from "../client.js";
import { makeTestCacheDir, removeTestCacheDir } from "../test-cache-dir.js";
import {
  HOURS_PER_MONTH,
  normalizeArmRegion,
  resolveVmMonthlyPrice,
} from "./vm.js";

function makeFetch(body: PricingResponse): FetchLike {
  return vi.fn<FetchLike>().mockResolvedValue({
    json: async () => body,
    ok: true,
    status: 200,
    statusText: "OK",
  });
}

let dir: string;

beforeEach(async () => {
  dir = await makeTestCacheDir("vm-resolver");
});

afterEach(async () => {
  await removeTestCacheDir(dir);
});

describe("normalizeArmRegion", () => {
  it.each([
    ["westeurope", "westeurope"],
    ["West Europe", "westeurope"],
    ["WEST EUROPE", "westeurope"],
    ["  West   Europe ", "westeurope"],
    ["italynorth", "italynorth"],
  ])("normalises %j → %j", (input, expected) => {
    expect(normalizeArmRegion(input)).toBe(expected);
  });
});

describe("resolveVmMonthlyPrice", () => {
  it("picks the cheapest Linux consumption hourly item and returns 730×price", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          meterName: "B2s",
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
          meterName: "B2s",
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
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveVmMonthlyPrice(client, {
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
    });

    expect(money).toEqual({
      amount: Math.round(0.05 * HOURS_PER_MONTH * 100) / 100,
      currency: "EUR",
    });
  });

  it("picks the Windows item when os hint is 'windows'", async () => {
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
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveVmMonthlyPrice(client, {
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
      os: "windows",
    });

    expect(money?.amount).toBeCloseTo(0.09 * HOURS_PER_MONTH, 2);
  });

  it("skips Spot / Low Priority items", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          productName: "Virtual Machines BS Series",
          retailPrice: 0.01,
          skuName: "B2s Spot",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.01,
        },
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
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveVmMonthlyPrice(client, {
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
    });

    expect(money?.amount).toBeCloseTo(0.05 * HOURS_PER_MONTH, 2);
  });

  it("ignores Reservation entries", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          armSkuName: "Standard_B2s",
          currencyCode: "EUR",
          productName: "Virtual Machines BS Series",
          reservationTerm: "1 Year",
          retailPrice: 0.03,
          skuName: "B2s",
          type: "Reservation",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.03,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveVmMonthlyPrice(client, {
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
    });

    expect(money).toBeUndefined();
  });

  it("returns undefined when no items match", async () => {
    const body: PricingResponse = {
      Items: [],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveVmMonthlyPrice(client, {
      armRegionName: "westeurope",
      armSkuName: "Standard_B2s",
    });

    expect(money).toBeUndefined();
  });
});
