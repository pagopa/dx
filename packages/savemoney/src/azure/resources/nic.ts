/**
 * Azure Network Interface analysis
 */

import type { NetworkManagementClient } from "@azure/arm-network";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { AnalysisResult } from "../../types.js";

import {
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

/**
 * Analyzes an Azure Network Interface for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param networkClient - Azure Network client for NIC details
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeNic(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Network Interface (microsoft.network/networkinterfaces)",
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

  // Extract resource group and NIC name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const nicName = resourceParts[8];

  try {
    // Get detailed NIC information
    const nicDetails = await networkClient.networkInterfaces.get(
      resourceGroupName,
      nicName,
    );

    verboseLog(verbose, "NIC API details:", nicDetails);

    // Check if NIC is not attached to any VM or private endpoint
    if (!nicDetails.virtualMachine && !nicDetails.privateEndpoint) {
      reason += "NIC not attached to any VM or private endpoint. ";
    }

    // Check if NIC has no public IP
    const hasPublicIP = nicDetails.ipConfigurations?.some(
      (config) => config.publicIPAddress,
    );
    if (!hasPublicIP) {
      reason += "No public IP assigned. ";
    }

    // Note: Network Interface metrics are not available for Private Endpoint NICs
    // and most Azure NICs don't expose standard traffic metrics through Azure Monitor
    // The primary checks (attachment to VM and public IP assignment) are sufficient
  } catch (error) {
    const logger = getLogger(["dx-savemoney", "azure", "resources", "nic"]);
    logger.warn(
      `Failed to get NIC details for ${nicName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed NIC information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
