/**
 * Azure-specific types
 */

import type * as armResources from "@azure/arm-resources";

import type { Finding } from "../finding.js";
import type {
  AnalysisResult,
  BaseConfig,
  CostRisk,
  Thresholds,
} from "../types.js";

/**
 * Azure configuration extending base config
 */
export type AzureConfig = BaseConfig & {
  /**
   * Maximum number of resources analyzed in parallel within a single
   * subscription. Defaults to 8 when not provided. Set to 1 for a fully
   * sequential run (useful for debugging or to be gentler on quotas).
   */
  concurrency?: number;
  /**
   * Only analyze resources that match ALL the given tag key-value pairs.
   * If omitted, all resources are analyzed.
   */
  filterTags?: Map<string, string>;
  /**
   * Runtime-only pricing enrichment switch. This is intentionally not exposed
   * in YAML config: the Retail Prices lookup uses internal defaults unless the
   * CLI disables it for offline/debug runs.
   */
  pricing?: PricingConfig;
  /**
   * Which finding sources to include in the run.
   * - `"custom"`  → enables the per-resource analyzer plugins
   * - `"advisor"` → enables the Azure Advisor subscription-level analyzer
   *
   * Defaults to `["advisor", "custom"]` when omitted (i.e. all sources).
   */
  sources: [AzureSource, ...AzureSource[]];
  subscriptionIds: string[];
  /**
   * Analysis thresholds. Defaults from DEFAULT_THRESHOLDS are used when not provided.
   */
  thresholds?: Thresholds;
  verbose?: boolean;
};

/**
 * Detailed report for a single Azure resource with full resource object.
 *
 * Phase 1 introduces the optional `findings` field carrying the unified
 * `Finding[]` model alongside the legacy `analysis` summary. The two are
 * kept in sync by the orchestrator so existing report formats keep
 * working untouched while new consumers (GUI, JSON exports, Phase 2
 * pricing aggregation) can read structured findings directly.
 */
export type AzureDetailedResourceReport = {
  analysis: AnalysisResult;
  /**
   * Structured findings attached to the resource. Always populated by the
   * orchestrator (possibly empty). Optional only for backward compatibility
   * with serialised payloads produced before Phase 1.
   */
  findings?: Finding[];
  resource: armResources.GenericResource;
};

/**
 * Summary report for a single Azure resource
 */
export type AzureResourceReport = {
  costRisk: CostRisk;
  location?: string;
  name: string;
  reason: string;
  resourceGroup?: string;
  subscriptionId: string;
  suspectedUnused: boolean;
  type: string;
};

/**
 * Finding sources that are valid for Azure analysis.
 * Narrowed from `FindingSource` to exclude "aws", which is not a valid
 * filter for Azure runs and would silently produce an empty report.
 */
export type AzureSource = "advisor" | "custom";

export type PricingConfig = {
  /**
   * Runtime switch used by the CLI `--no-pricing` flag. Pricing otherwise
   * stays enabled with internal defaults for currency and cache settings.
   */
  enabled?: boolean;
};
