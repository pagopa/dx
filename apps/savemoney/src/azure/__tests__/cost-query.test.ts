import type { TokenCredential } from "@azure/identity";

import { setTimeout } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";

import { CostQueryClient } from "../cost-query.js";

vi.mock("node:timers/promises", () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

const period = { end: "2026-11-13", start: "2026-10-15" };
const resource =
  "/subscriptions/sub1/resourcegroups/rg/providers/example/type/name";
const endpoint =
  "https://management.azure.com/subscriptions/sub1/providers/Microsoft.CostManagement/query";
const credential: TokenCredential = {
  getToken: async () => ({
    expiresOnTimestamp: Date.now() + 60_000,
    token: "token",
  }),
};

function page(
  columns: string[],
  rows: unknown[][],
  nextLink?: string,
): Response {
  return new Response(
    JSON.stringify({
      properties: {
        columns: columns.map((name) => ({ name })),
        nextLink,
        rows,
      },
    }),
  );
}

describe("CostQueryClient", () => {
  it("retries throttled requests after the longest Azure retry delay", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: {
            "retry-after": "1",
            "x-ms-ratelimit-microsoft.costmanagement-entity-retry-after": "10",
          },
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        page(["PreTaxCost", "ResourceId", "Currency"], [[2, resource, "EUR"]]),
      );

    const costs = await new CostQueryClient(credential, fetch).getResourceCosts(
      "sub1",
      period,
    );

    expect(setTimeout).toHaveBeenCalledWith(10_000);
    expect(costs.get(resource)?.[0].amount).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]?.body).toBe(fetch.mock.calls[0]?.[1]?.body);
  });

  it("bounds retries and fails immediately when Azure requires a long wait", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(
        async () =>
          new Response(null, { headers: { "retry-after": "0" }, status: 429 }),
      );
    const client = new CostQueryClient(credential, fetch);

    await expect(client.getResourceCosts("sub1", period)).rejects.toThrow(
      "HTTP 429",
    );
    expect(fetch).toHaveBeenCalledTimes(3);

    fetch.mockClear().mockResolvedValue(
      new Response(null, {
        headers: { "retry-after": "120" },
        status: 429,
      }),
    );
    await expect(client.getResourceCosts("sub1", period)).rejects.toThrow(
      "Retry in 120s",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aggregates resource costs across pages and currencies using response column names", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        page(
          ["PreTaxCost", "ResourceId", "Currency"],
          [
            [1.25, resource.toUpperCase(), "EUR"],
            [4, null, "EUR"],
          ],
          `${endpoint}?api-version=2021-10-01&$skiptoken=next`,
        ),
      )
      .mockResolvedValueOnce(
        page(
          ["Currency", "ResourceId", "PreTaxCost"],
          [
            ["EUR", resource, -0.25],
            ["USD", resource, 2],
          ],
        ),
      );

    const costs = await new CostQueryClient(credential, fetch).getResourceCosts(
      "sub1",
      period,
    );

    expect(costs.get(resource)).toEqual([
      { amount: 1, basis: "ActualCost", currency: "EUR", period },
      { amount: 2, basis: "ActualCost", currency: "USD", period },
    ]);
    expect(costs.size).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("POST");
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      dataset: { grouping: [{ name: "ResourceId", type: "Dimension" }] },
      timePeriod: { from: "2026-10-15T00:00:00Z", to: "2026-11-13T23:59:59Z" },
      type: "ActualCost",
    });
  });

  it("fails explicitly for missing columns and unauthorized requests", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(page(["PreTaxCost", "Currency"], []))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    const client = new CostQueryClient(credential, fetch);

    await expect(client.getResourceCosts("sub1", period)).rejects.toThrow(
      "required column",
    );
    await expect(client.getResourceCosts("sub1", period)).rejects.toThrow(
      "HTTP 403",
    );
  });

  it("does not send credentials to an unexpected continuation URL", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        page(
          ["PreTaxCost", "ResourceId", "Currency"],
          [],
          "https://example.com/query",
        ),
      );

    await expect(
      new CostQueryClient(credential, fetch).getResourceCosts("sub1", period),
    ).rejects.toThrow("unexpected continuation URL");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
