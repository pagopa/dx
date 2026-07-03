/**
 * Tests for the App Service Plan Retail Prices resolver.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../client.js";
import type { PricingResponse } from "../schema.js";

import { DiskCache } from "../cache.js";
import { PricingClient } from "../client.js";
import { makeTestCacheDir, removeTestCacheDir } from "../test-cache-dir.js";
import { resolveAppServicePlanMonthlyPrice } from "./app-service.js";
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
  dir = await makeTestCacheDir("app-service-resolver");
});

afterEach(async () => {
  await removeTestCacheDir(dir);
});

describe("resolveAppServicePlanMonthlyPrice", () => {
  it("returns the monthly cost for the matching Linux plan SKU and worker count", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "S1 App",
          productName: "Azure App Service Standard Plan",
          retailPrice: 0.087758,
          skuName: "S1",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.087758,
        },
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
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveAppServicePlanMonthlyPrice(client, {
      armRegionName: "westeurope",
      os: "linux",
      skuName: "S1",
      workerCount: 2,
    });

    expect(money).toEqual({
      amount: Math.round(0.08337 * HOURS_PER_MONTH * 2 * 100) / 100,
      currency: "EUR",
    });
  });

  it("matches Retail Prices SKU names with inconsistent spacing", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "P2 v3 App",
          productName: "Azure App Service Premium v3 Plan",
          retailPrice: 0.593243,
          skuName: "P2 v3",
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 0.593243,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveAppServicePlanMonthlyPrice(client, {
      armRegionName: "West Europe",
      os: "windows",
      skuName: "P2v3",
    });

    expect(money?.amount).toBeCloseTo(0.593243 * HOURS_PER_MONTH, 2);
  });

  it("ignores non-plan and non-consumption meters", async () => {
    const body: PricingResponse = {
      Items: [
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "Standard Bandwidth Usage",
          productName: "Static Web Apps",
          retailPrice: 0.175516,
          skuName: "Standard",
          type: "Consumption",
          unitOfMeasure: "1 GB",
          unitPrice: 0.175516,
        },
        {
          armRegionName: "westeurope",
          currencyCode: "EUR",
          meterName: "S1 App",
          productName: "Azure App Service Standard Plan",
          reservationTerm: "1 Year",
          retailPrice: 640,
          skuName: "S1",
          type: "Reservation",
          unitOfMeasure: "1 Hour",
          unitPrice: 640,
        },
      ],
      NextPageLink: null,
    };
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: makeFetch(body),
    });

    const money = await resolveAppServicePlanMonthlyPrice(client, {
      armRegionName: "westeurope",
      skuName: "S1",
    });

    expect(money).toBeUndefined();
  });
});
