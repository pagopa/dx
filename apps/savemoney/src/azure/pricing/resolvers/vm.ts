/**
 * Resolver: estimated monthly cost of an Azure Virtual Machine SKU.
 *
 * Uses the Azure Retail Prices API to look up the pay-as-you-go consumption
 * price for the given `armSkuName` in the given region, then converts the
 * hourly rate to a monthly figure assuming the conventional `730 hours`
 * (365.25 * 24 / 12) for "always-on" workloads.
 *
 * The lookup is intentionally conservative:
 *  - It restricts results to `type === "Consumption"` (no Reservations,
 *    no Spot/Low Priority, no Savings Plans).
 *  - It defaults to the Linux variant (cheapest) when the resource OS is
 *    unknown, so the returned figure is a LOWER BOUND of the real cost.
 *  - It returns `undefined` whenever it cannot identify a single
 *    unambiguous price item, so callers can treat the savings estimate
 *    as best-effort.
 */

import type { Money } from "../../../finding.js";
import type { PricingClient } from "../client.js";
import type { PriceItem } from "../schema.js";

/**
 * Conventional hours-per-month used across Azure cost calculators
 * (365.25 days × 24 h / 12 months ≈ 730).
 */
export const HOURS_PER_MONTH = 730;

export type ResolveVmInput = {
  /** ARM region name, e.g. `westeurope`. */
  armRegionName: string;
  /** ARM SKU name, e.g. `Standard_B2s`. */
  armSkuName: string;
  /** Optional OS hint. Defaults to `linux`. */
  os?: VmOs;
};

/**
 * Operating system hint used to disambiguate Windows vs. Linux meters.
 * When unset (default) the cheapest Linux variant is picked.
 */
export type VmOs = "linux" | "windows";

/**
 * Normalises a region string to the `armRegionName` format expected by
 * the Retail Prices API (lowercase, no spaces). The Azure SDK sometimes
 * returns the display name (`"West Europe"`) instead of the ARM name
 * (`"westeurope"`); without this normalisation the OData filter would
 * silently miss every entry.
 */
export function normalizeArmRegion(region: string): string {
  return region.toLowerCase().replace(/\s+/g, "");
}

/**
 * Resolves the estimated monthly cost for a VM SKU. Returns `undefined`
 * if no matching consumption meter can be found.
 */
export async function resolveVmMonthlyPrice(
  client: PricingClient,
  input: ResolveVmInput,
): Promise<Money | undefined> {
  const filter = [
    "serviceName eq 'Virtual Machines'",
    `armRegionName eq '${normalizeArmRegion(input.armRegionName)}'`,
    `armSkuName eq '${input.armSkuName}'`,
  ].join(" and ");

  const items = await client.query(filter);
  const item = pickVmItem(items, input.os ?? "linux");
  if (!item) {
    return undefined;
  }

  return {
    amount: round2(item.unitPrice * HOURS_PER_MONTH),
    currency: item.currencyCode,
  };
}

function isSpotOrLowPriority(item: PriceItem): boolean {
  const sku = item.skuName?.toLowerCase() ?? "";
  const meter = item.meterName?.toLowerCase() ?? "";
  return (
    sku.includes("spot") ||
    sku.includes("low priority") ||
    meter.includes("spot") ||
    meter.includes("low priority")
  );
}

function matchesOs(item: PriceItem, os: VmOs): boolean {
  const product = item.productName?.toLowerCase() ?? "";
  const isWindowsItem = product.includes("windows");
  return os === "windows" ? isWindowsItem : !isWindowsItem;
}

/**
 * Picks the most appropriate Retail Prices entry for the given OS hint.
 *
 * Filters out:
 *  - non-Consumption entries (Reservations, Savings Plans, …)
 *  - Spot / Low Priority entries (variable pricing)
 *  - Windows entries when the hint is `linux` and vice versa
 *
 * Then prefers the entry with the lowest `unitPrice` to act as a
 * conservative lower bound.
 */
function pickVmItem(items: PriceItem[], os: VmOs): PriceItem | undefined {
  const candidates = items.filter(
    (it) =>
      it.type === "Consumption" &&
      it.unitOfMeasure === "1 Hour" &&
      !isSpotOrLowPriority(it) &&
      matchesOs(it, os),
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((cheapest, it) =>
    it.unitPrice < cheapest.unitPrice ? it : cheapest,
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
