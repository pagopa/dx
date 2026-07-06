/**
 * Azure App Service Plan analysis
 */

import type { WebSiteManagementClient } from "@azure/arm-appservice";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { AnalysisResult, Thresholds } from "../../types.js";
import type { PricingService } from "../pricing/pricing-service.js";

import { DEFAULT_THRESHOLDS } from "../../types.js";
import {
  getMetric,
  type MetricsCache,
  type MonitorClientLike,
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

export type AppServicePlanClientLike = {
  appServicePlans: Pick<WebSiteManagementClient["appServicePlans"], "get">;
};

type AppServicePlanPricing = Pick<PricingService, "resolveAppServicePlan">;

/**
 * Analyzes an Azure App Service Plan for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param webSiteClient - Azure Web Site client for App Service Plan details
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to analyze metrics
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeAppServicePlan(
  resource: armResources.GenericResource,
  webSiteClient: AppServicePlanClientLike,
  monitorClient: MonitorClientLike,
  timespanDays: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  verbose = false,
  cache?: MetricsCache,
  pricing?: AppServicePlanPricing,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "App Service Plan (microsoft.web/serverfarms)",
  );
  verboseLog(verbose, "Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "high";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and App Service Plan name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const planName = resourceParts[8];

  try {
    // Get detailed App Service Plan information
    const planDetails = await webSiteClient.appServicePlans.get(
      resourceGroupName,
      planName,
    );

    verboseLog(verbose, "App Service Plan API details:", planDetails);

    const hasNoApps = planDetails.numberOfSites === 0;

    // Check if the plan has no apps
    if (hasNoApps) {
      reason += "App Service Plan has no apps deployed. ";
    }

    // Check CPU and Memory metrics
    const cpuPercentage = await getMetric(
      monitorClient,
      resource.id,
      "CpuPercentage",
      "Average",
      timespanDays,
      cache,
    );

    const memoryPercentage = await getMetric(
      monitorClient,
      resource.id,
      "MemoryPercentage",
      "Average",
      timespanDays,
      cache,
    );

    if (
      cpuPercentage !== null &&
      cpuPercentage < thresholds.appService.cpuPercent
    ) {
      reason += `Very low CPU usage (${cpuPercentage.toFixed(2)}%). `;
    }

    if (
      memoryPercentage !== null &&
      memoryPercentage < thresholds.appService.memoryPercent
    ) {
      reason += `Very low memory usage (${memoryPercentage.toFixed(2)}%). `;
    }

    // Check if it's an oversized plan (Premium tier with low usage)
    if (
      planDetails.sku?.tier?.includes("Premium") &&
      cpuPercentage !== null &&
      cpuPercentage < thresholds.appService.premiumCpuPercent
    ) {
      reason += "Premium tier with low resource utilization. ";
    }

    const suspectedUnused = reason.length > 0;
    const result = await enrichWithPricing(
      { costRisk, reason: reason.trim(), suspectedUnused },
      planDetails,
      resource,
      hasNoApps,
      pricing,
    );
    verboseLogAnalysisResult(verbose, result);
    return result;
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get App Service Plan details for ${planName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed App Service Plan information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}

async function enrichWithPricing(
  result: AnalysisResult,
  planDetails: Awaited<
    ReturnType<AppServicePlanClientLike["appServicePlans"]["get"]>
  >,
  resource: armResources.GenericResource,
  hasNoApps: boolean,
  pricing?: AppServicePlanPricing,
): Promise<AnalysisResult> {
  // Underutilized plans need right-sizing analysis, not a full removable
  // cost-at-risk.
  if (!pricing || !result.suspectedUnused || !hasNoApps) {
    return result;
  }

  try {
    const skuName = planDetails.sku?.name;
    const armRegionName = planDetails.location ?? resource.location;
    if (!skuName || !armRegionName) {
      return result;
    }

    const estimatedMonthlyCostAtRisk = await pricing.resolveAppServicePlan({
      armRegionName,
      os: planDetails.reserved === true ? "linux" : "windows",
      skuName,
      workerCount: planDetails.sku?.capacity ?? planDetails.numberOfWorkers,
    });
    return estimatedMonthlyCostAtRisk
      ? { ...result, estimatedMonthlyCostAtRisk }
      : result;
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to enrich App Service Plan ${resource.name ?? "unknown"} with pricing: ${error instanceof Error ? error.message : error}`,
    );
    return result;
  }
}
