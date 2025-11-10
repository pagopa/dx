/**
 * Azure Public IP analysis
 */

import type { MonitorClient } from "@azure/arm-monitor";
import type { NetworkManagementClient } from "@azure/arm-network";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { AnalysisResult } from "../../types.js";

import {
  getMetric,
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
 * @returns Analysis result with cost risk and reason
 */
export async function analyzePublicIp(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
  monitorClient: MonitorClient,
  timespanDays: number,
  verbose = false,
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

  try {
    // Get detailed Public IP information
    const publicIpDetails = await networkClient.publicIPAddresses.get(
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
      "Total",
      timespanDays,
    );

    if (bytesInDDoS !== null && bytesInDDoS < 1000000) {
      // Less than 1MB total in 30 days
      reason += `Very low network traffic (${(bytesInDDoS / 1024 / 1024).toFixed(2)} MB). `;
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get Public IP details for ${publicIpName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Public IP information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
