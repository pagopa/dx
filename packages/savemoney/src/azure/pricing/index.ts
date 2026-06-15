/**
 * Public surface of the pricing module.
 *
 * Phase 2 exposes:
 *   - `PricingClient`       — HTTP client for the Azure Retail Prices API
 *   - `DiskCache`           — disk-backed cache used by the client
 *   - `PricingService`      — orchestrator memoizing per-resource lookups
 *   - resolvers per resource family (VM, Public IP — Disk planned next)
 *   - schema types for the API response
 */

export {
  DEFAULT_CACHE_DIR,
  DEFAULT_CACHE_TTL_MS,
  DiskCache,
  type DiskCacheOptions,
} from "./cache.js";
export {
  type FetchLike,
  PricingClient,
  type PricingClientOptions,
} from "./client.js";
export { PricingService } from "./pricing-service.js";
export {
  HOURS_PER_MONTH,
  type PublicIpAllocation,
  type PublicIpSku,
  type ResolvePublicIpInput,
  resolvePublicIpMonthlyPrice,
  type ResolveVmInput,
  resolveVmMonthlyPrice,
  type VmOs,
} from "./resolvers/index.js";
export {
  type PriceItem,
  PriceItemSchema,
  type PricingResponse,
  PricingResponseSchema,
} from "./schema.js";
