/**
 * Azure-specific types
 */

import type * as armResources from "@azure/arm-resources";

import type { AnalysisResult, BaseConfig, CostRisk } from "../types.js";

/**
 * Azure configuration extending base config
 */
export type AzureConfig = BaseConfig & {
  subscriptionIds: string[];
  tenantId: string;
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
