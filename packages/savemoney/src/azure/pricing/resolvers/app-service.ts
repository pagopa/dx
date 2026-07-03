/**
 * Resolver: estimated monthly cost of an Azure App Service Plan.
 *
 * App Service Plan meters are published as hourly prices per plan instance.
 * The resolver looks up all App Service meters in the target region, then
 * matches the ARM plan SKU locally because Retail Prices uses inconsistent
 * spacing for some families (for example `P1v3` vs `P1 v3`).
 */

import type { Money } from "../../../finding.js";
import type { PricingClient } from "../client.js";
import type { PriceItem } from "../schema.js";

import { HOURS_PER_MONTH, normalizeArmRegion } from "./vm.js";

export type AppServicePlanOs = "linux" | "windows";

export type ResolveAppServicePlanInput = {
  /** ARM region name, e.g. `westeurope`. */
  armRegionName: string;
  /** Optional OS hint. When absent, the cheapest matching meter is used. */
  os?: AppServicePlanOs;
  /** App Service Plan SKU name, e.g. `S1`, `P1v3`, `P1mv3`. */
  skuName: string;
  /** Number of plan workers/instances to price. Defaults to 1. */
  workerCount?: number;
};

/**
 * Resolves the estimated monthly cost for an App Service Plan. Returns
 * `undefined` if no matching consumption meter can be found.
 */
export async function resolveAppServicePlanMonthlyPrice(
  client: PricingClient,
  input: ResolveAppServicePlanInput,
): Promise<Money | undefined> {
  const filter = [
    "serviceName eq 'Azure App Service'",
    `armRegionName eq '${normalizeArmRegion(input.armRegionName)}'`,
  ].join(" and ");

  const items = await client.query(filter);
  const item = pickAppServicePlanItem(items, input);
  if (!item) {
    return undefined;
  }

  return {
    amount: round2(
      item.unitPrice *
        HOURS_PER_MONTH *
        normalizeWorkerCount(input.workerCount),
    ),
    currency: item.currencyCode,
  };
}

function matchesOs(item: PriceItem, os: AppServicePlanOs | undefined): boolean {
  if (!os) return true;
  const product = item.productName?.toLowerCase() ?? "";
  const isLinuxItem = product.includes("linux");
  return os === "linux" ? isLinuxItem : !isLinuxItem;
}

function normalizeSkuName(value: string | undefined): string {
  return value?.toLowerCase().replace(/\s+/g, "") ?? "";
}

function normalizeWorkerCount(workerCount: number | undefined): number {
  if (!workerCount || workerCount < 1) return 1;
  return Math.ceil(workerCount);
}

function pickAppServicePlanItem(
  items: PriceItem[],
  input: ResolveAppServicePlanInput,
): PriceItem | undefined {
  const skuName = normalizeSkuName(input.skuName);
  const candidates = items.filter(
    (it) =>
      it.type === "Consumption" &&
      it.unitOfMeasure === "1 Hour" &&
      normalizeSkuName(it.skuName) === skuName &&
      (it.productName?.toLowerCase().includes("app service") ?? false) &&
      (it.productName?.toLowerCase().includes("plan") ?? false) &&
      matchesOs(it, input.os),
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((cheapest, it) =>
    it.unitPrice < cheapest.unitPrice ? it : cheapest,
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
