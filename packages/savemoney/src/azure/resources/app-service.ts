/**
 * Azure App Service Plan analysis
 */

import type { WebSiteManagementClient } from "@azure/arm-appservice";
import type { MonitorClient } from "@azure/arm-monitor";

import * as armResources from "@azure/arm-resources";

import type { AnalysisResult } from "../../types.js";

import {
  debugLog,
  debugLogAnalysisResult,
  debugLogResourceStart,
  getMetric,
} from "../utils.js";

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
  webSiteClient: WebSiteManagementClient,
  monitorClient: MonitorClient,
  timespanDays: number,
): Promise<AnalysisResult> {
  debugLogResourceStart(
    resource.name || "unknown",
    "App Service Plan (microsoft.web/serverfarms)",
  );
  debugLog("Resource details:", resource);

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

    debugLog("App Service Plan API details:", planDetails);

    // Check if the plan has no apps
    if (!planDetails.numberOfSites || planDetails.numberOfSites === 0) {
      reason += "App Service Plan has no apps deployed. ";
    }

    // Check CPU and Memory metrics
    const cpuPercentage = await getMetric(
      monitorClient,
      resource.id,
      "CpuPercentage",
      "Average",
      timespanDays,
    );

    const memoryPercentage = await getMetric(
      monitorClient,
      resource.id,
      "MemoryPercentage",
      "Average",
      timespanDays,
    );

    if (cpuPercentage !== null && cpuPercentage < 5) {
      reason += `Very low CPU usage (${cpuPercentage.toFixed(2)}%). `;
    }

    if (memoryPercentage !== null && memoryPercentage < 10) {
      reason += `Very low memory usage (${memoryPercentage.toFixed(2)}%). `;
    }

    // Check if it's an oversized plan (Premium tier with low usage)
    if (
      planDetails.sku?.tier?.includes("Premium") &&
      cpuPercentage &&
      cpuPercentage < 10
    ) {
      reason += "Premium tier with low resource utilization. ";
    }
  } catch (error) {
    console.warn(
      `Failed to get App Service Plan details for ${planName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed App Service Plan information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  debugLogAnalysisResult(result);
  return result;
}
