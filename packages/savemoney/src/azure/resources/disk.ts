/**
 * Azure Managed Disk analysis
 */

import type { ComputeManagementClient, Disk } from "@azure/arm-compute";

import * as armResources from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

import type { Money } from "../../finding.js";
import type { AnalysisResult } from "../../types.js";
import type { PricingService } from "../pricing/pricing-service.js";
import type { DiskSku } from "../pricing/resolvers/index.js";

import { DiskSkuSchema } from "../pricing/resolvers/index.js";
import {
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

export type DiskComputeClientLike = {
  disks: Pick<ComputeManagementClient["disks"], "get">;
};

type DiskPricing = Pick<PricingService, "resolveDisk">;

/**
 * Analyzes an Azure Managed Disk for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param computeClient - Azure Compute client for disk details
 * @param verbose - Whether verbose logging is enabled
 * @param pricing - Optional pricing service for monetary enrichment
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeDisk(
  resource: armResources.GenericResource,
  computeClient: DiskComputeClientLike,
  verbose = false,
  pricing?: DiskPricing,
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
      const result: AnalysisResult = {
        costRisk,
        reason: "Disk is unattached. ",
        suspectedUnused: true,
      };
      const enriched = await enrichWithPricing(result, diskDetails, pricing);
      verboseLogAnalysisResult(verbose, enriched);
      return enriched;
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
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

/**
 * Best-effort: looks up the monthly price for the disk's `(sku, size,
 * region)` triple and attaches it as `estimatedMonthlyCostAtRisk`. Any
 * failure (unsupported SKU, missing fields, resolver error) leaves the
 * original result unchanged.
 */
async function enrichWithPricing(
  result: AnalysisResult,
  diskDetails: Disk,
  pricing: DiskPricing | undefined,
): Promise<AnalysisResult> {
  if (!pricing) return result;

  const sku = toSupportedSku(diskDetails.sku?.name);
  const diskSizeGiB = diskDetails.diskSizeGB;
  const armRegionName = diskDetails.location;
  if (!sku || !diskSizeGiB || !armRegionName) return result;

  const money: Money | undefined = await pricing.resolveDisk({
    armRegionName,
    diskSizeGiB,
    sku,
  });
  return money ? { ...result, estimatedMonthlyCostAtRisk: money } : result;
}

/**
 * Narrows the SDK's `sku.name` string to the resolver-supported subset
 * (excludes `UltraSSD_LRS` and any future tiers we don't price yet).
 */
function toSupportedSku(name: string | undefined): DiskSku | undefined {
  const parsed = DiskSkuSchema.safeParse(name);
  return parsed.success ? parsed.data : undefined;
}
