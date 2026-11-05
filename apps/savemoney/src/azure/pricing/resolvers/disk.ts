/**
 * Resolver: estimated monthly cost of an Azure Managed Disk.
 *
 * Azure prices managed disks per discrete capacity tier (P1…P80,
 * E1…E80, S4…S80) rather than per actual `diskSizeGB`. The resolver:
 *
 *  1. Maps the disk SKU (`Premium_LRS`, `StandardSSD_ZRS`, …) and
 *     `diskSizeGB` to the corresponding billing tier (e.g. `P10 LRS`).
 *  2. Queries the Azure Retail Prices API with the tier-derived
 *     `skuName` for the right service / region.
 *  3. Returns the consumption price (already `1/Month` in the API) as
 *     `Money`, or `undefined` if no match (e.g. Ultra disks, which use
 *     a different per-GB / IOPS / throughput pricing model and are not
 *     yet supported).
 *
 * The mapping is intentionally encoded in a single Zod-validated
 * lookup table so a malformed input fails fast and loud rather than
 * silently producing a wrong tier.
 */

import { z } from "zod";

import type { Money } from "../../../finding.js";
import type { PricingClient } from "../client.js";
import type { PriceItem } from "../schema.js";

import { normalizeArmRegion } from "./vm.js";

/**
 * Replication mode supported by the resolver. Ultra disks (`UltraSSD_LRS`)
 * are intentionally excluded because their pricing is multi-dimensional
 * (capacity + IOPS + throughput) and would need a dedicated resolver.
 */
export const DiskSkuSchema = z.enum([
  "Premium_LRS",
  "Premium_ZRS",
  "StandardSSD_LRS",
  "StandardSSD_ZRS",
  "Standard_LRS",
]);
export type DiskSku = z.infer<typeof DiskSkuSchema>;

/**
 * Inclusive upper bound (GiB) → tier name. Order matters: the resolver
 * picks the FIRST entry whose `maxSizeGiB` is greater-or-equal to the
 * requested size.
 *
 * See https://learn.microsoft.com/azure/virtual-machines/disks-types for
 * the canonical tier table.
 */
const TIER_TABLE: readonly { maxSizeGiB: number; tier: number }[] = [
  { maxSizeGiB: 4, tier: 1 },
  { maxSizeGiB: 8, tier: 2 },
  { maxSizeGiB: 16, tier: 3 },
  { maxSizeGiB: 32, tier: 4 },
  { maxSizeGiB: 64, tier: 6 },
  { maxSizeGiB: 128, tier: 10 },
  { maxSizeGiB: 256, tier: 15 },
  { maxSizeGiB: 512, tier: 20 },
  { maxSizeGiB: 1024, tier: 30 },
  { maxSizeGiB: 2048, tier: 40 },
  { maxSizeGiB: 4096, tier: 50 },
  { maxSizeGiB: 8192, tier: 60 },
  { maxSizeGiB: 16384, tier: 70 },
  { maxSizeGiB: 32768, tier: 80 },
];

const SKU_METADATA = {
  Premium_LRS: {
    prefix: "P",
    productName: "Premium SSD Managed Disks",
    replication: "LRS",
  },
  Premium_ZRS: {
    prefix: "P",
    productName: "Premium SSD Managed Disks",
    replication: "ZRS",
  },
  Standard_LRS: {
    prefix: "S",
    productName: "Standard HDD Managed Disks",
    replication: "LRS",
  },
  StandardSSD_LRS: {
    prefix: "E",
    productName: "Standard SSD Managed Disks",
    replication: "LRS",
  },
  StandardSSD_ZRS: {
    prefix: "E",
    productName: "Standard SSD Managed Disks",
    replication: "ZRS",
  },
} as const satisfies Record<
  DiskSku,
  { prefix: string; productName: string; replication: string }
>;

export const ResolveDiskInputSchema = z.object({
  /** ARM region name, e.g. `westeurope`. */
  armRegionName: z.string().min(1),
  /** Disk capacity in GiB as reported by the Compute API (`diskSizeGB`). */
  diskSizeGiB: z.number().int().positive(),
  /** Managed disk SKU. */
  sku: DiskSkuSchema,
});
export type ResolveDiskInput = z.infer<typeof ResolveDiskInputSchema>;

/**
 * Pure helper exposed for testing: resolves the size→tier mapping
 * without touching the network.
 */
export function pickTier(diskSizeGiB: number): number | undefined {
  return TIER_TABLE.find((row) => diskSizeGiB <= row.maxSizeGiB)?.tier;
}

/**
 * Resolves the estimated monthly cost for a Managed Disk. Returns
 * `undefined` if the SKU/size combo is unsupported (e.g. exceeds the
 * largest tier) or if no matching Retail Prices entry is found.
 */
export async function resolveDiskMonthlyPrice(
  client: PricingClient,
  rawInput: ResolveDiskInput,
): Promise<Money | undefined> {
  const input = ResolveDiskInputSchema.parse(rawInput);
  const tier = pickTier(input.diskSizeGiB);
  if (tier === undefined) return undefined;

  const { prefix, productName, replication } = SKU_METADATA[input.sku];
  const skuName = `${prefix}${tier} ${replication}`;

  const filter = [
    "serviceName eq 'Storage'",
    `armRegionName eq '${normalizeArmRegion(input.armRegionName)}'`,
    `productName eq '${productName}'`,
    `skuName eq '${skuName}'`,
  ].join(" and ");

  const items = await client.query(filter);
  const item = pickDiskItem(items, skuName);
  if (!item) return undefined;

  return {
    amount: round2(item.unitPrice),
    currency: item.currencyCode,
  };
}

function pickDiskItem(
  items: PriceItem[],
  skuName: string,
): PriceItem | undefined {
  // Managed Disk meters are reported as `1/Month`; we keep the filter
  // explicit to avoid accidentally picking a per-hour or per-IOPS entry.
  const candidates = items.filter(
    (it) =>
      it.type === "Consumption" &&
      it.unitOfMeasure === "1/Month" &&
      it.skuName === skuName,
  );
  if (candidates.length === 0) return undefined;
  return candidates.reduce((cheapest, it) =>
    it.unitPrice < cheapest.unitPrice ? it : cheapest,
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
