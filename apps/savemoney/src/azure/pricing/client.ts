/**
 * HTTP client for the Azure Retail Prices REST API.
 *
 * Endpoint: https://prices.azure.com/api/retail/prices
 *
 * The API is **public and unauthenticated** — no `TokenCredential`
 * required — but it is rate-limited per source IP. To stay polite we:
 *   1. Cache the full paginated result for each `$filter` on disk
 *      (`DiskCache`, 24h TTL by default) and return cached items
 *      immediately on hit.
 *   2. Follow `NextPageLink` sequentially (no parallel page fetches).
 *
 * The client is constructed with an optional `fetch` implementation to
 * make it trivially mockable in tests; in production it uses the global
 * `fetch` available since Node 18.
 */

import { getLogger } from "@logtape/logtape";

import type { PriceItem, PricingResponse } from "./schema.js";

import { DiskCache } from "./cache.js";
import { PricingResponseSchema } from "./schema.js";

const DEFAULT_BASE_URL = "https://prices.azure.com/api/retail/prices";
/** Hard cap on pages to follow — protects against runaway loops. */
const MAX_PAGES = 100;

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  statusText: string;
}>;

export type PricingClientOptions = {
  /** Override the base URL. Useful for staging or fixtures. */
  baseUrl?: string;
  /** Disk cache instance. Defaults to the user's cache directory. */
  cache?: DiskCache;
  /**
   * Currency to ask the API for. The response items always carry their
   * own `currencyCode`, but specifying it here returns localised prices
   * where available. Defaults to "EUR".
   */
  currencyCode?: string;
  /** Inject a custom `fetch` (used by tests). Defaults to the global one. */
  fetch?: FetchLike;
};

/**
 * Thin wrapper around the Retail Prices endpoint.
 *
 * Use `query(filter)` with an OData `$filter` expression, e.g.:
 *   serviceName eq 'Virtual Machines' and armRegionName eq 'westeurope' and armSkuName eq 'Standard_B2s'
 */
export class PricingClient {
  private readonly baseUrl: string;
  private readonly cache: DiskCache;
  private readonly currencyCode: string;
  private readonly fetchImpl: FetchLike;
  private readonly logger = getLogger(["savemoney", "azure", "pricing"]);

  constructor(options: PricingClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.cache = options.cache ?? new DiskCache();
    this.currencyCode = options.currencyCode ?? "EUR";
    // The global `fetch` exists in Node ≥ 18 / 24 but TypeScript types it
    // loosely; we narrow to `FetchLike` to keep the surface intentional.
    this.fetchImpl =
      options.fetch ??
      ((input, init) => fetch(input, init) as ReturnType<FetchLike>);
  }

  /**
   * Returns every meter that matches the given OData `$filter`, following
   * pagination transparently. Results are cached for `cache.ttlMs`.
   *
   * Throws when the API returns a non-2xx status or a response that fails
   * schema validation: pricing lookups are advisory (callers should treat
   * "no data" as "skip the savings estimate") but a malformed payload
   * signals a real upstream change that deserves attention.
   */
  async query(filter: string): Promise<PriceItem[]> {
    const cacheKey = `${this.currencyCode}|${filter}`;
    const cached = await this.cache.get<PriceItem[]>(cacheKey);
    if (cached) {
      this.logger.debug(
        `pricing cache hit (${cached.length} items): ${filter}`,
      );
      return cached;
    }

    const items: PriceItem[] = [];
    const firstUrl = this.buildUrl(filter);
    let nextUrl: string | undefined = firstUrl;
    for (let page = 0; nextUrl && page < MAX_PAGES; page++) {
      const response: PricingResponse = await this.fetchPage(nextUrl);
      items.push(...response.Items);
      nextUrl = response.NextPageLink ?? undefined;
    }
    if (nextUrl) {
      this.logger.warn(
        `pricing query truncated at ${MAX_PAGES} pages: ${filter}`,
      );
    }
    await this.cache.set(cacheKey, items);
    return items;
  }

  private buildUrl(filter: string): string {
    const params = new URLSearchParams({
      $filter: filter,
      "api-version": "2023-01-01-preview",
      currencyCode: this.currencyCode,
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  private async fetchPage(url: string): Promise<PricingResponse> {
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Azure Retail Prices API returned ${res.status} ${res.statusText}`,
      );
    }
    const body = await res.json().catch((error: unknown) => {
      throw new Error("Azure Retail Prices API returned invalid JSON", {
        cause: error,
      });
    });
    return PricingResponseSchema.parse(body);
  }
}
