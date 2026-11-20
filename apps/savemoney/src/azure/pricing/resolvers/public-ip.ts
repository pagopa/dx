/**
 * Resolver: estimated monthly cost of an Azure Public IP address.
 *
 * Uses the Azure Retail Prices API to look up the pay-as-you-go price for
 * the given SKU + region + allocation method combination, then converts
 * the hourly rate (when reported as `1 Hour`) to a monthly figure using
 * the conventional 730-hours-per-month constant.
 *
 * Public IP pricing is published per `(sku, allocation)` pair. Both
 * Standard SKU and a Static Basic SKU carry a billable hourly rate; a
 * Dynamic Basic SKU is typically free when associated, and the lookup
 * returns `undefined` in that case.
 */

import type { Money } from "../../../finding.js";
import type { PricingClient } from "../client.js";
import type { PriceItem } from "../schema.js";

import { HOURS_PER_MONTH, normalizeArmRegion } from "./vm.js";

export type PublicIpAllocation = "dynamic" | "static";
export type PublicIpSku = "basic" | "standard";

export type ResolvePublicIpInput = {
  /** Allocation method (`Static` / `Dynamic`). */
  allocation: PublicIpAllocation;
  /** ARM region name, e.g. `westeurope`. */
  armRegionName: string;
  /** SKU (`Basic` / `Standard`). */
  sku: PublicIpSku;
};

/**
 * Resolves the estimated monthly cost for a Public IP. Returns
 * `undefined` when no matching consumption meter is found (e.g. the
 * combination is genuinely free).
 */
export async function resolvePublicIpMonthlyPrice(
  client: PricingClient,
  input: ResolvePublicIpInput,
): Promise<Money | undefined> {
  // Public IPs are billed under the "Virtual Network" service.
  const filter = [
    "serviceName eq 'Virtual Network'",
    `armRegionName eq '${normalizeArmRegion(input.armRegionName)}'`,
    `skuName eq '${capitalize(input.sku)}'`,
  ].join(" and ");

  const items = await client.query(filter);
  const item = pickPublicIpItem(items, input.allocation);
  if (!item) {
    return undefined;
  }

  return {
    amount: round2(item.unitPrice * HOURS_PER_MONTH),
    currency: item.currencyCode,
  };
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

function pickPublicIpItem(
  items: PriceItem[],
  allocation: PublicIpAllocation,
): PriceItem | undefined {
  const allocationToken = allocation === "static" ? "static" : "dynamic";
  const candidates = items.filter(
    (it) =>
      it.type === "Consumption" &&
      it.unitOfMeasure === "1 Hour" &&
      (it.meterName?.toLowerCase().includes("ip address") ?? false) &&
      (it.meterName?.toLowerCase().includes(allocationToken) ?? false),
  );
  if (candidates.length === 0) return undefined;
  // Pick the cheapest entry as a conservative lower bound.
  return candidates.reduce((cheapest, it) =>
    it.unitPrice < cheapest.unitPrice ? it : cheapest,
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
