/**
 * Azure Private Endpoint analysis
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
 * Analyzes an Azure Private Endpoint for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param networkClient - Azure Network client for Private Endpoint details
 * @returns Analysis result with cost risk and reason
 */
export async function analyzePrivateEndpoint(
  resource: armResources.GenericResource,
  networkClient: NetworkManagementClient,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Private Endpoint (microsoft.network/privateendpoints)",
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

  // Extract resource group and private endpoint name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const privateEndpointName = resourceParts[8];

  try {
    // Get detailed Private Endpoint information
    const privateEndpointDetails = await networkClient.privateEndpoints.get(
      resourceGroupName,
      privateEndpointName,
    );

    verboseLog(
      verbose,
      "Private Endpoint API details:",
      privateEndpointDetails,
    );

    // Check if Private Endpoint has no private link service connection
    if (
      !privateEndpointDetails.privateLinkServiceConnections ||
      privateEndpointDetails.privateLinkServiceConnections.length === 0
    ) {
      reason +=
        "Private Endpoint has no private link service connections configured. ";
    }

    // Check connection state
    const hasFailedConnection =
      privateEndpointDetails.privateLinkServiceConnections?.some(
        (connection) =>
          connection.privateLinkServiceConnectionState?.status === "Rejected" ||
          connection.privateLinkServiceConnectionState?.status ===
            "Disconnected",
      );

    if (hasFailedConnection) {
      reason += "Private Endpoint has rejected or disconnected connections. ";
    }

    // Check if Private Endpoint has network interfaces
    if (
      !privateEndpointDetails.networkInterfaces ||
      privateEndpointDetails.networkInterfaces.length === 0
    ) {
      reason += "Private Endpoint has no network interfaces attached. ";
    }

    // Check subnet configuration
    if (!privateEndpointDetails.subnet) {
      reason += "Private Endpoint is not associated with a subnet. ";
    }
  } catch (error) {
    const logger = getLogger([
      "dx-savemoney",
      "azure",
      "resources",
      "private-endpoint",
    ]);
    logger.warn(
      `Failed to get Private Endpoint details for ${privateEndpointName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Private Endpoint information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
