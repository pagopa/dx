/**
 * Azure-specific types
 */

import type * as armResources from "@azure/arm-resources";

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
   * Only analyze resources that match ALL the given tag key-value pairs.
   * If omitted, all resources are analyzed.
   */
  filterTags?: Record<string, string>;
  subscriptionIds: string[];
  tenantId: string;
  /**
   * Analysis thresholds. Defaults from DEFAULT_THRESHOLDS are used when not provided.
   */
  thresholds?: Thresholds;
  verbose?: boolean;
};

/**
 * Detailed report for a single Azure resource with full resource object
 */
export type AzureDetailedResourceReport = {
  analysis: AnalysisResult;
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
