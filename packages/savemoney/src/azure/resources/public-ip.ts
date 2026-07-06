/**
 * Azure Public IP analysis
 */

import type { MonitorClient } from "@azure/arm-monitor";
import type { NetworkManagementClient } from "@azure/arm-network";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { AnalysisResult, Thresholds } from "../../types.js";
import type { PricingService } from "../pricing/pricing-service.js";

import { DEFAULT_THRESHOLDS } from "../../types.js";
import {
  getMetric,
  type MetricsCache,
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

/**
 * Analyzes an Azure Public IP for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param networkClient - Azure Network client for Public IP details
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to analyze metrics
 * @param pricing - Optional pricing facade for estimated monthly cost
 * @returns Analysis result with cost risk and reason
 */
export async function analyzePublicIp(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
  monitorClient: MonitorClient,
  timespanDays: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  verbose = false,
  cache?: MetricsCache,
  pricing?: PricingService,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Public IP (microsoft.network/publicipaddresses)",
  );
  verboseLog(verbose, "Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and public IP name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const publicIpName = resourceParts[8];

  // Capture details outside the try so the pricing enrichment below can
  // reuse them without an extra API round-trip.
  let publicIpDetails:
    | Awaited<ReturnType<typeof networkClient.publicIPAddresses.get>>
    | undefined;

  try {
    // Get detailed Public IP information
    publicIpDetails = await networkClient.publicIPAddresses.get(
      resourceGroupName,
      publicIpName,
    );

    verboseLog(verbose, "Public IP API details:", publicIpDetails);

    // Check if Public IP is not associated with any resource
    if (!publicIpDetails.ipConfiguration && !publicIpDetails.natGateway) {
      reason += "Public IP not associated with any resource. ";
    }

    // Check if it's a static IP that might be unused
    if (
      publicIpDetails.publicIPAllocationMethod === "Static" &&
      !publicIpDetails.ipConfiguration
    ) {
      reason += "Static IP not in use. ";
    }

    // Check network metrics for low usage
    const bytesInDDoS = await getMetric(
      monitorClient,
      resource.id,
      "BytesInDDoS",
      "Average",
      timespanDays,
      cache,
    );

    if (bytesInDDoS !== null && bytesInDDoS < thresholds.publicIp.bytesInDDoS) {
      reason += `Very low network traffic (${(bytesInDDoS / 1024 / 1024).toFixed(2)} MB/day avg). `;
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get Public IP details for ${publicIpName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Public IP information. ";
  }

  const suspectedUnused = reason.length > 0;
  const baseResult = { costRisk, reason: reason.trim(), suspectedUnused };
  const result = await enrichWithPricing(
    baseResult,
    resource,
    publicIpDetails,
    pricing,
  );
  verboseLogAnalysisResult(verbose, result);
  return result;
}

/**
 * Best-effort enrichment of a Public IP analysis result with the
 * estimated monthly cost recoverable by removing the resource.
 */
async function enrichWithPricing(
  result: AnalysisResult,
  resource: armResources.GenericResource,
  publicIpDetails:
    | Awaited<ReturnType<NetworkManagementClient["publicIPAddresses"]["get"]>>
    | undefined,
  pricing?: PricingService,
): Promise<AnalysisResult> {
  if (!pricing || !result.suspectedUnused || !publicIpDetails) {
    return result;
  }
  try {
    const skuName = publicIpDetails.sku?.name?.toLowerCase();
    const allocation = publicIpDetails.publicIPAllocationMethod?.toLowerCase();
    const armRegionName = publicIpDetails.location ?? resource.location;
    if (
      !armRegionName ||
      (skuName !== "basic" && skuName !== "standard") ||
      (allocation !== "static" && allocation !== "dynamic")
    ) {
      return result;
    }
    const estimatedMonthlySavings = await pricing.resolvePublicIp({
      allocation,
      armRegionName,
      sku: skuName,
    });
    if (!estimatedMonthlySavings) {
      return result;
    }
    return { ...result, estimatedMonthlySavings };
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to enrich Public IP with pricing: ${error instanceof Error ? error.message : error}`,
    );
    return result;
  }
}
