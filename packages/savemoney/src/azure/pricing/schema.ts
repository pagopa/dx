/**
 * Zod schemas for the Azure Retail Prices REST API.
 *
 * Endpoint: https://prices.azure.com/api/retail/prices
 * Docs:     https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices
 *
 * The API returns a flat list of `Items` (one per meter) plus an optional
 * `NextPageLink` for pagination. Extra fields returned by Azure are tolerated,
 * but the fields used by pricing logic are validated with narrow shapes.
 */

import { z } from "zod";

const NonEmptyStringSchema = z.string().min(1);
/**
 * Optional metadata fields. The Retail Prices API returns `""` (not the
 * field omitted) for meters where a given attribute doesn't apply (e.g.
 * `armSkuName` for Bandwidth/Support meters), so these must tolerate empty
 * strings — resolvers already treat empty and missing values the same way
 * (`?.toLowerCase() ?? ""`).
 */
const OptionalStringSchema = z.string().optional();
const PriceTypeSchema = z.enum([
  "Consumption",
  "DevTestConsumption",
  "Reservation",
]);
const PriceValueSchema = z.number().finite().nonnegative();

/**
 * A single priced meter returned by the Retail Prices API.
 *
 * Notable fields:
 * - `unitPrice`: list price per `unitOfMeasure` (e.g. "1 Hour", "1 GB/Month")
 * - `retailPrice`: typically equals `unitPrice` but kept distinct by Azure
 * - `armSkuName`: ARM SKU identifier (e.g. "Standard_B2s") — present for
 *   VM/compute meters, absent for some services (Bandwidth, Support, …)
 * - `reservationTerm`: present ONLY for Reservation meters; consumers that
 *   want on-demand pricing must filter by `type === "Consumption"`.
 */
export const PriceItemSchema = z.object({
  armRegionName: OptionalStringSchema,
  armSkuName: OptionalStringSchema,
  currencyCode: z.string().length(3),
  effectiveStartDate: OptionalStringSchema,
  isPrimaryMeterRegion: z.boolean().optional(),
  location: OptionalStringSchema,
  meterId: OptionalStringSchema,
  meterName: OptionalStringSchema,
  productId: OptionalStringSchema,
  productName: OptionalStringSchema,
  reservationTerm: OptionalStringSchema,
  retailPrice: PriceValueSchema,
  serviceFamily: OptionalStringSchema,
  serviceId: OptionalStringSchema,
  serviceName: OptionalStringSchema,
  skuId: OptionalStringSchema,
  skuName: OptionalStringSchema,
  tierMinimumUnits: PriceValueSchema.optional(),
  /** "Consumption" | "Reservation" | "DevTestConsumption". */
  type: PriceTypeSchema,
  unitOfMeasure: NonEmptyStringSchema,
  unitPrice: PriceValueSchema,
});
export type PriceItem = z.infer<typeof PriceItemSchema>;

/**
 * Top-level response envelope. `Count` reflects the number of items in the
 * current page, not the grand total.
 */
export const PricingResponseSchema = z.object({
  BillingCurrency: z.string().length(3).optional(),
  Count: z.number().int().nonnegative().optional(),
  Items: z.array(PriceItemSchema),
  NextPageLink: z.string().url().nullable().optional(),
});
export type PricingResponse = z.infer<typeof PricingResponseSchema>;
