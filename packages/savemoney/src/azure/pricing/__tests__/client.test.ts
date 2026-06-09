/**
 * Tests for the Azure Retail Prices HTTP client.
 *
 * The client is exercised against an in-process fake `fetch` so the suite
 * never reaches the real `prices.azure.com` endpoint. A temp directory is
 * used as cache so each test starts from a cold state.
 */

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FetchLike } from "../client.js";

import { DiskCache } from "../cache.js";
import { PricingClient } from "../client.js";

const FIXTURE_PATH = new URL(
  "./fixtures/vm-b2s-westeurope.json",
  import.meta.url,
);

async function loadFixture(): Promise<unknown> {
  const raw = await readFile(FIXTURE_PATH, "utf8");
  return JSON.parse(raw);
}

function makeOkFetch(body: unknown): FetchLike {
  return vi.fn(async () => ({
    json: async () => body,
    ok: true,
    status: 200,
    statusText: "OK",
  }));
}

describe("PricingClient.query", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "dx-savemoney-client-test-"));
  });
  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it("returns the items from a single page response", async () => {
    const body = await loadFixture();
    const fetchImpl = makeOkFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: fetchImpl,
    });

    const items = await client.query("serviceName eq 'Virtual Machines'");

    expect(items).toHaveLength(2);
    expect(items[0].armSkuName).toBe("Standard_B2s");
    expect(items[0].unitPrice).toBe(0.057);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("includes the filter, currency, and api-version in the request URL", async () => {
    const body = await loadFixture();
    const fetchImpl = makeOkFetch(body);
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      currencyCode: "EUR",
      fetch: fetchImpl,
    });

    await client.query("serviceName eq 'Virtual Machines'");

    const url = (fetchImpl as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("prices.azure.com/api/retail/prices");
    expect(url).toContain("currencyCode=EUR");
    expect(url).toContain("api-version=");
    // URLSearchParams encodes spaces as `+` (form-urlencoded), so we
    // convert them back before decoding the filter expression.
    const decoded = decodeURIComponent(url.replace(/\+/g, " "));
    expect(decoded).toContain("$filter=serviceName eq 'Virtual Machines'");
  });

  it("follows NextPageLink across multiple pages", async () => {
    const page1 = {
      Count: 1,
      Items: [
        {
          currencyCode: "EUR",
          retailPrice: 1,
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 1,
        },
      ],
      NextPageLink: "https://prices.azure.com/api/retail/prices?next=2",
    };
    const page2 = {
      Count: 1,
      Items: [
        {
          currencyCode: "EUR",
          retailPrice: 2,
          type: "Consumption",
          unitOfMeasure: "1 Hour",
          unitPrice: 2,
        },
      ],
      NextPageLink: null,
    };
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce({
        json: async () => page1,
        ok: true,
        status: 200,
        statusText: "OK",
      })
      .mockResolvedValueOnce({
        json: async () => page2,
        ok: true,
        status: 200,
        statusText: "OK",
      });

    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: fetchImpl,
    });
    const items = await client.query("anything");

    expect(items.map((i) => i.unitPrice)).toEqual([1, 2]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("serves a cached response without hitting the network on the second call", async () => {
    const body = await loadFixture();
    const fetchImpl = makeOkFetch(body);
    const cache = new DiskCache({ dir });
    const client = new PricingClient({ cache, fetch: fetchImpl });

    const first = await client.query("filter-a");
    const second = await client.query("filter-a");

    expect(first).toEqual(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps cache entries scoped by currency", async () => {
    const body = await loadFixture();
    const fetchImpl = makeOkFetch(body);
    const cache = new DiskCache({ dir });
    const eur = new PricingClient({
      cache,
      currencyCode: "EUR",
      fetch: fetchImpl,
    });
    const usd = new PricingClient({
      cache,
      currencyCode: "USD",
      fetch: fetchImpl,
    });

    await eur.query("same-filter");
    await usd.query("same-filter");

    // Two distinct cache keys → two API round-trips, no cross-contamination.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws a descriptive error on a non-2xx response", async () => {
    const fetchImpl: FetchLike = vi.fn(async () => ({
      json: async () => ({}),
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    }));
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: fetchImpl,
    });

    await expect(client.query("x")).rejects.toThrow(/503/);
  });

  it("throws when the response body fails schema validation", async () => {
    const fetchImpl = makeOkFetch({ wrong: "shape" });
    const client = new PricingClient({
      cache: new DiskCache({ dir }),
      fetch: fetchImpl,
    });

    await expect(client.query("x")).rejects.toThrow();
  });
});
