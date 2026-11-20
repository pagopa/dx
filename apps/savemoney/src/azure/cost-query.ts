/**
 * Azure Cost Management query adapter for resource-level actual costs.
 */

import type { TokenCredential } from "@azure/identity";

import { getLogger } from "@logtape/logtape";
import { setTimeout } from "node:timers/promises";
import { z } from "zod";

import type { ActualCost } from "./types.js";

const API_ROOT = "https://management.azure.com";
const TOKEN_SCOPE = `${API_ROOT}/.default`;
const API_VERSION = "2026-06-01";
const REQUEST_TIMEOUT_MS = 60_000;

const QueryResponseSchema = z.object({
  properties: z.object({
    columns: z.array(z.object({ name: z.string() })),
    nextLink: z.string().nullish(),
    rows: z.array(z.array(z.unknown())),
  }),
});

const CostRowSchema = z.object({
  amount: z.number().finite(),
  currency: z.string().length(3),
  resourceId: z.string().nullable(),
});

export class CostQueryClient {
  constructor(
    private readonly credential: TokenCredential,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async getResourceCosts(
    subscriptionId: string,
    period: ActualCost["period"],
  ): Promise<Map<string, ActualCost[]>> {
    const token = await this.credential.getToken(TOKEN_SCOPE);
    if (!token) {
      throw new Error(
        "Azure Cost Management authentication returned no token.",
      );
    }

    const path = `/subscriptions/${encodeURIComponent(subscriptionId)}/providers/Microsoft.CostManagement/query`;
    let url: string | undefined =
      `${API_ROOT}${path}?api-version=${API_VERSION}`;
    const body = JSON.stringify({
      dataset: {
        aggregation: { totalCost: { function: "Sum", name: "PreTaxCost" } },
        granularity: "None",
        grouping: [{ name: "ResourceId", type: "Dimension" }],
      },
      timeframe: "Custom",
      timePeriod: {
        from: `${period.start}T00:00:00Z`,
        to: `${period.end}T23:59:59Z`,
      },
      type: "ActualCost",
    });
    const totals = new Map<string, Map<string, ActualCost>>();
    const visited = new Set<string>();

    while (url) {
      const next = new URL(url, API_ROOT);
      if (
        next.origin !== API_ROOT ||
        next.pathname.toLowerCase() !== path.toLowerCase()
      ) {
        throw new Error(
          "Azure Cost Management returned an unexpected continuation URL.",
        );
      }
      if (visited.has(next.href)) {
        throw new Error(
          "Azure Cost Management returned a repeated continuation URL.",
        );
      }
      visited.add(next.href);

      const response = await this.request(next.href, {
        body,
        headers: {
          Authorization: `Bearer ${token.token}`,
          ClientType: "pagopa-dx-savemoney",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (response.status === 204) break;
      if (!response.ok) {
        throw new Error(
          `Azure Cost Management query returned HTTP ${response.status}.`,
        );
      }
      const parsed = QueryResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error(
          "Azure Cost Management query returned an invalid response.",
          {
            cause: parsed.error,
          },
        );
      }

      const { columns, nextLink, rows } = parsed.data.properties;
      const amountIndex = columns.findIndex(
        (column) => column.name === "PreTaxCost",
      );
      const currencyIndex = columns.findIndex(
        (column) => column.name === "Currency",
      );
      const resourceIdIndex = columns.findIndex(
        (column) => column.name === "ResourceId",
      );
      if (amountIndex < 0 || currencyIndex < 0 || resourceIdIndex < 0) {
        throw new Error(
          "Azure Cost Management query omitted a required column.",
        );
      }
      for (const row of rows) {
        const cost = CostRowSchema.safeParse({
          amount: row[amountIndex],
          currency: row[currencyIndex],
          resourceId: row[resourceIdIndex],
        });
        if (!cost.success) {
          throw new Error(
            "Azure Cost Management query returned an invalid cost row.",
            {
              cause: cost.error,
            },
          );
        }
        const resourceId = cost.data.resourceId?.trim().toLowerCase();
        if (!resourceId) continue;
        const byCurrency = totals.get(resourceId) ?? new Map();
        const existing = byCurrency.get(cost.data.currency);
        byCurrency.set(cost.data.currency, {
          amount: (existing?.amount ?? 0) + cost.data.amount,
          basis: "ActualCost",
          currency: cost.data.currency,
          period,
        });
        totals.set(resourceId, byCurrency);
      }
      url = nextLink ?? undefined;
    }

    return new Map(
      [...totals].map(([resourceId, byCurrency]) => [
        resourceId,
        [...byCurrency.values()],
      ]),
    );
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    let waitedMs = 0;
    for (let attempt = 0; ; attempt++) {
      const response = await this.fetchImpl(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status !== 429) return response;
      const waitMs = retryDelayMs(response.headers, attempt);
      await response.body?.cancel();
      if (attempt === 2 || waitedMs + waitMs > 60_000) {
        throw new Error(
          `Azure Cost Management is rate limited (HTTP 429). Retry in ${Math.ceil(waitMs / 1000)}s or run without --include-actual-cost.`,
        );
      }
      getLogger(["savemoney", "azure"]).warn(
        `Azure Cost Management is rate limited (HTTP 429); retrying in ${Math.ceil(waitMs / 1000)}s.`,
      );
      await setTimeout(waitMs);
      waitedMs += waitMs;
    }
  }
}

function retryDelayMs(headers: Headers, attempt: number): number {
  const delays = [...headers.entries()]
    .filter(
      ([name]) =>
        name === "retry-after" ||
        (name.startsWith("x-ms-ratelimit-microsoft.") &&
          name.endsWith("retry-after")),
    )
    .map(([, value]) => {
      const seconds = Number(value);
      return value.trim() && Number.isFinite(seconds)
        ? seconds * 1000
        : Date.parse(value) - Date.now();
    })
    .filter((delay) => Number.isFinite(delay) && delay >= 0);
  return delays.length ? Math.max(...delays) : 5000 * 2 ** attempt;
}
