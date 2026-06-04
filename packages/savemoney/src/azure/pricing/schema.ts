/**
 * Zod schemas for the Azure Retail Prices REST API.
 *
 * Endpoint: https://prices.azure.com/api/retail/prices
 * Docs:     https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices
 *
 * The API returns a flat list of `Items` (one per meter) plus an optional
 * `NextPageLink` for pagination. The schemas below model only the fields the
 * resolvers consume — extra fields returned by the API are tolerated
 * silently (we do NOT use `.strict()`) so a future SDK addition does not
 * break parsing.
 */

import { z } from "zod";

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
  armRegionName: z.string().optional(),
  armSkuName: z.string().optional(),
  currencyCode: z.string(),
  effectiveStartDate: z.string().optional(),
  isPrimaryMeterRegion: z.boolean().optional(),
  location: z.string().optional(),
  meterId: z.string().optional(),
  meterName: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  reservationTerm: z.string().optional(),
  retailPrice: z.number(),
  serviceFamily: z.string().optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  skuId: z.string().optional(),
  skuName: z.string().optional(),
  tierMinimumUnits: z.number().optional(),
  /** "Consumption" | "Reservation" | "DevTestConsumption". */
  type: z.string(),
  unitOfMeasure: z.string(),
  unitPrice: z.number(),
});
export type PriceItem = z.infer<typeof PriceItemSchema>;

/**
 * Top-level response envelope. `Count` reflects the number of items in the
 * current page, not the grand total.
 */
export const PricingResponseSchema = z.object({
  BillingCurrency: z.string().optional(),
  Count: z.number().optional(),
  Items: z.array(PriceItemSchema),
  NextPageLink: z.string().nullable().optional(),
});
export type PricingResponse = z.infer<typeof PricingResponseSchema>;
