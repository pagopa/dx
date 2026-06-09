/**
 * Public exports for resolvers.
 */

export type { DiskSku, ResolveDiskInput } from "./disk.js";
export {
  DiskSkuSchema,
  pickTier,
  ResolveDiskInputSchema,
  resolveDiskMonthlyPrice,
} from "./disk.js";

export type {
  PublicIpAllocation,
  PublicIpSku,
  ResolvePublicIpInput,
} from "./public-ip.js";
export { resolvePublicIpMonthlyPrice } from "./public-ip.js";

export type { ResolveVmInput, VmOs } from "./vm.js";
export {
  HOURS_PER_MONTH,
  normalizeArmRegion,
  resolveVmMonthlyPrice,
} from "./vm.js";
