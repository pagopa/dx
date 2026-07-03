/**
 * High-level facade that exposes per-resource pricing resolvers backed by
 * a shared `PricingClient` (and therefore a shared disk cache).
 *
 * Two responsibilities:
 *  1. Dispatch the right resolver for the right resource kind.
 *  2. Memoize identical lookups within a single run so concurrent
 *     analyzers asking for the same `(sku, region, …)` only hit the
 *     network (or disk cache) once.
 *  3. Swallow resolver errors and return `undefined` — the savings
 *     estimate is best-effort and should never break the main analysis
 *     flow.
 */

import { getLogger } from "@logtape/logtape";

import type { Money } from "../../finding.js";
import type { PricingClient } from "./client.js";
import type {
  ResolveAppServicePlanInput,
  ResolveDiskInput,
  ResolvePublicIpInput,
  ResolveVmInput,
} from "./resolvers/index.js";

import {
  resolveAppServicePlanMonthlyPrice,
  resolveDiskMonthlyPrice,
  resolvePublicIpMonthlyPrice,
  resolveVmMonthlyPrice,
} from "./resolvers/index.js";

const logger = getLogger(["savemoney", "azure", "pricing"]);

export class PricingService {
  /** In-memory memo keyed by the canonicalised lookup input. */
  private readonly memo = new Map<string, Promise<Money | undefined>>();

  constructor(private readonly client: PricingClient) {}

  /**
   * Resolves the estimated monthly cost of an App Service Plan SKU.
   * Returns `undefined` on no-match or on error.
   */
  async resolveAppServicePlan(
    input: ResolveAppServicePlanInput,
  ): Promise<Money | undefined> {
    const key = `app-service-plan|${input.armRegionName}|${input.skuName}|${input.os ?? "any"}|${input.workerCount ?? 1}`;
    return this.memoize(key, () =>
      this.safeResolve(() =>
        resolveAppServicePlanMonthlyPrice(this.client, input),
      ),
    );
  }

  /**
   * Resolves the estimated monthly cost of a Managed Disk. Returns
   * `undefined` on no-match (e.g. unsupported SKU like UltraSSD) or on
   * error.
   */
  async resolveDisk(input: ResolveDiskInput): Promise<Money | undefined> {
    const key = `disk|${input.armRegionName}|${input.sku}|${input.diskSizeGiB}`;
    return this.memoize(key, () =>
      this.safeResolve(() => resolveDiskMonthlyPrice(this.client, input)),
    );
  }

  /**
   * Resolves the estimated monthly cost of a Public IP. Returns
   * `undefined` on no-match or on error.
   */
  async resolvePublicIp(
    input: ResolvePublicIpInput,
  ): Promise<Money | undefined> {
    const key = `public-ip|${input.armRegionName}|${input.sku}|${input.allocation}`;
    return this.memoize(key, () =>
      this.safeResolve(() => resolvePublicIpMonthlyPrice(this.client, input)),
    );
  }

  /**
   * Resolves the estimated monthly cost of a Virtual Machine SKU.
   * Returns `undefined` on no-match or on error.
   */
  async resolveVm(input: ResolveVmInput): Promise<Money | undefined> {
    const key = `vm|${input.armRegionName}|${input.armSkuName}|${input.os ?? "linux"}`;
    return this.memoize(key, () =>
      this.safeResolve(() => resolveVmMonthlyPrice(this.client, input)),
    );
  }

  private memoize(
    key: string,
    factory: () => Promise<Money | undefined>,
  ): Promise<Money | undefined> {
    const cached = this.memo.get(key);
    if (cached) return cached;
    const promise = factory().then((money) => {
      if (money === undefined) {
        // Debug-level so it shows up under `-v` but doesn't clutter the
        // default output. Helps diagnosing "I see no savings" reports
        // when the Retail Prices API has no entry for the queried
        // (region, sku, …) combination.
        logger.debug(`Pricing lookup returned no match for ${key}`);
      }
      return money;
    });
    this.memo.set(key, promise);
    return promise;
  }

  private async safeResolve(
    factory: () => Promise<Money | undefined>,
  ): Promise<Money | undefined> {
    try {
      return await factory();
    } catch (error) {
      logger.warn(
        `Pricing lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }
}
