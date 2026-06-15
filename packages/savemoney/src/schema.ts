/**
 * Zod schemas for the SaveMoney YAML configuration file.
 *
 * The entire config is represented by a single `ConfigSchema` composed of
 * sub-schemas.  All types used at runtime are derived from these schemas via
 * `z.infer<>` so the source of truth is always the schema.
 *
 * YAML structure:
 * ```yaml
 * azure:
 *   subscriptionIds:
 *     - xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   preferredLocation: italynorth  # optional
 *   timespanDays: 30               # optional
 *   thresholds:                    # optional – omit to keep built-in defaults
 *     vm:
 *       cpuPercent: 5
 * ```
 */

import { z } from "zod";

// ── per-resource threshold sub-schemas ──────────────────────────────────────

const VmThresholdsSchema = z
  .object({
    /** CPU threshold (%) below which usage is flagged as low. Default: 1 */
    cpuPercent: z.number().default(1),
    /** Network inbound threshold (bytes/day) below which traffic is flagged as low. Default: 3 MB */
    networkInBytesPerDay: z.number().default(1024 * 1024 * 3),
  })
  .strict();

const AppServiceThresholdsSchema = z
  .object({
    /** CPU threshold (%) below which usage is flagged as very low. Default: 5 */
    cpuPercent: z.number().default(5),
    /** Memory threshold (%) below which usage is flagged as very low. Default: 10 */
    memoryPercent: z.number().default(10),
    /** CPU threshold (%) for Premium-tier plans below which over-provisioning is flagged. Default: 10 */
    premiumCpuPercent: z.number().default(10),
  })
  .strict();

const ContainerAppThresholdsSchema = z
  .object({
    /** CPU threshold (nanoCores) below which usage is flagged as very low. Default: 1 000 000 (0.001 cores) */
    cpuNanoCores: z.number().default(1_000_000),
    /** Memory threshold (bytes) below which usage is flagged as very low. Default: 10 MB */
    memoryBytes: z.number().default(10_485_760),
    /** Combined Rx+Tx network threshold (bytes/day) below which traffic is flagged as very low. Default: ~33 KB */
    networkBytes: z.number().default(34_000),
  })
  .strict();

const StorageThresholdsSchema = z
  .object({
    /** Average daily transaction count below which the account is flagged. Default: 10 */
    transactionsPerDay: z.number().default(10),
  })
  .strict();

const PublicIpThresholdsSchema = z
  .object({
    /** DDoS inbound bytes/day threshold below which traffic is flagged as very low. Default: ~332 KB */
    bytesInDDoS: z.number().default(340_000),
  })
  .strict();

const StaticSiteThresholdsSchema = z
  .object({
    /** Total bytes sent below which data transfer is flagged as very low. Default: 1 MB */
    bytesSent: z.number().default(1_048_576),
    /** Total site hits below which traffic is flagged as very low. Default: 100 */
    siteHits: z.number().default(100),
  })
  .strict();

// ── composed thresholds schema ───────────────────────────────────────────────

export const ThresholdsSchema = z
  .object({
    appService: AppServiceThresholdsSchema.optional().transform((v) =>
      AppServiceThresholdsSchema.parse(v ?? {}),
    ),
    containerApp: ContainerAppThresholdsSchema.optional().transform((v) =>
      ContainerAppThresholdsSchema.parse(v ?? {}),
    ),
    publicIp: PublicIpThresholdsSchema.optional().transform((v) =>
      PublicIpThresholdsSchema.parse(v ?? {}),
    ),
    staticSite: StaticSiteThresholdsSchema.optional().transform((v) =>
      StaticSiteThresholdsSchema.parse(v ?? {}),
    ),
    storage: StorageThresholdsSchema.optional().transform((v) =>
      StorageThresholdsSchema.parse(v ?? {}),
    ),
    vm: VmThresholdsSchema.optional().transform((v) =>
      VmThresholdsSchema.parse(v ?? {}),
    ),
  })
  .strict();

// ── pricing section ─────────────────────────────────────────────────────────

export const PricingSectionSchema = z
  .object({
    /**
     * Absolute path to the on-disk pricing cache directory. Defaults to a
     * temp-dir subfolder when omitted.
     */
    cacheDir: z.string().optional(),
    /**
     * Cache TTL in hours. Defaults to 24 (prices are republished daily).
     */
    cacheTtlHours: z.number().positive().default(24),
    /**
     * ISO 4217 currency code returned by the Retail Prices API. Defaults to EUR.
     */
    currency: z.string().min(3).max(3).default("EUR"),
    /**
     * Whether to enrich findings with estimated monthly cost. Defaults to true.
     */
    enabled: z.boolean().default(true),
  })
  .strict();

// ── top-level config schema ──────────────────────────────────────────────────

const AzureSectionSchema = z
  .object({
    /**
     * Maximum number of resources analyzed in parallel within a single
     * subscription. Defaults to 8 when not provided.
     */
    concurrency: z.number().int().positive().optional(),
    preferredLocation: z.string().default("italynorth"),
    /**
     * Pricing enrichment settings. Defaults applied when the section is
     * omitted (pricing enabled, EUR, 24h TTL, temp-dir cache).
     */
    pricing: PricingSectionSchema.optional().transform((v) =>
      PricingSectionSchema.parse(v ?? {}),
    ),
    /**
     * Which finding sources to include. Defaults to all known sources.
     * Authors can narrow the run to e.g. `["advisor"]` to fetch only
     * Azure Advisor recommendations, or `["custom"]` to skip Advisor.
     */
    sources: z
      .array(z.enum(["advisor", "custom"]))
      .nonempty()
      .default(["advisor", "custom"]),
    subscriptionIds: z
      .array(z.string())
      .min(
        1,
        "Config file must contain at least one entry in 'azure.subscriptionIds'",
      ),
    thresholds: ThresholdsSchema.optional().transform((v) =>
      ThresholdsSchema.parse(v ?? {}),
    ),
    timespanDays: z.number().int().positive().default(30),
  })
  .strict();

/**
 * Single Zod schema representing the entire YAML configuration file.
 * Use `ConfigSchema.parse(rawYaml)` to validate and apply defaults.
 */
export const ConfigSchema = z.object({ azure: AzureSectionSchema }).strict();

// ── inferred types ───────────────────────────────────────────────────────────

/** Fully-resolved configuration (all defaults applied). */
export type Config = z.infer<typeof ConfigSchema>;

/** Fully-resolved pricing section (all defaults applied). */
export type PricingConfig = z.infer<typeof PricingSectionSchema>;

/** Fully-resolved thresholds (all defaults applied). */
export type Thresholds = z.infer<typeof ThresholdsSchema>;
