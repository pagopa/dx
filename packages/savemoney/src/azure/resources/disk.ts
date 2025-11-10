/**
 * Azure Managed Disk analysis
 */

import type { ComputeManagementClient } from "@azure/arm-compute";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { AnalysisResult } from "../../types.js";

import {
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

/**
 * Analyzes an Azure Managed Disk for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param computeClient - Azure Compute client for disk details
 * @param verbose - Whether verbose logging is enabled
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeDisk(
  resource: armResources.GenericResource,
  computeClient: ComputeManagementClient,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Managed Disk (microsoft.compute/disks)",
  );
  verboseLog(verbose, "Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "medium";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  // Extract resource group and disk name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const diskName = resourceParts[8];

  try {
    // Get the actual disk details to check attachment state
    const diskDetails = await computeClient.disks.get(
      resourceGroupName,
      diskName,
    );

    verboseLog(verbose, "Disk API details:", diskDetails);

    // Check if disk is unattached
    if (
      diskDetails.diskState?.toLowerCase() === "unattached" ||
      !diskDetails.managedBy
    ) {
      const result = {
        costRisk,
        reason: "Disk is unattached. ",
        suspectedUnused: true,
      };
      verboseLogAnalysisResult(verbose, result);
      return result;
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure", "resources", "disk"]);
    logger.warn(
      `Failed to get disk details for ${diskName}: ${error instanceof Error ? error.message : error}`,
    );
    // Fallback to checking properties if API call fails
    // Note: GenericResource doesn't have diskState property
    // Without API access, we can't determine if disk is unattached
  }

  const result = { costRisk, reason: "", suspectedUnused: false };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
