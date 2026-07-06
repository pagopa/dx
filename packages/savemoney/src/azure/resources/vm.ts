/**
 * Azure Virtual Machine analysis
 */

import type { ComputeManagementClient } from "@azure/arm-compute";

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

export type VMComputeClientLike = {
  virtualMachines: Pick<
    ComputeManagementClient["virtualMachines"],
    "get" | "instanceView"
  >;
};

type VMPricing = Pick<PricingService, "resolveVm">;

/**
 * Analyzes an Azure Virtual Machine for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param monitorClient - Azure Monitor client for fetching metrics
 * @param computeClient - Azure Compute client for VM details
 * @param timespanDays - Number of days to analyze metrics
 * @param verbose - Whether verbose logging is enabled
 * @param cache - Run-scoped metrics cache
 * @param pricing - Optional pricing facade for estimated monthly cost
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeVM(
  resource: armResources.GenericResource,
  monitorClient: MonitorClientLike,
  computeClient: VMComputeClientLike,
  timespanDays: number,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  verbose = false,
  cache?: MetricsCache,
  pricing?: VMPricing,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Virtual Machine (microsoft.compute/virtualmachines)",
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

  // Extract resource group and VM name from resource ID
  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const vmName = resourceParts[8];

  try {
    // Get the actual VM instance view to check power state
    const instanceView = await computeClient.virtualMachines.instanceView(
      resourceGroupName,
      vmName,
    );

    verboseLog(verbose, "VM Instance View:", instanceView);

    // Check power state from instance view
    const vmStatus = instanceView.statuses?.find((s: { code?: string }) =>
      s.code?.startsWith("PowerState/"),
    );

    if (vmStatus?.code === "PowerState/deallocated") {
      const result = await enrichWithPricing(
        {
          costRisk,
          reason: "VM is deallocated. ",
          suspectedUnused: true,
        },
        resource,
        computeClient,
        resourceGroupName,
        vmName,
        pricing,
      );
      verboseLogAnalysisResult(verbose, result);
      return result;
    }

    if (vmStatus?.code === "PowerState/stopped") {
      const result = await enrichWithPricing(
        {
          costRisk,
          reason: "VM is stopped. ",
          suspectedUnused: true,
        },
        resource,
        computeClient,
        resourceGroupName,
        vmName,
        pricing,
      );
      verboseLogAnalysisResult(verbose, result);
      return result;
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get VM instance view for ${vmName}: ${error instanceof Error ? error.message : error}`,
    );
    // Continue with metric analysis if instance view fails
  }

  // Check metrics for low utilization
  const cpuUsage = await getMetric(
    monitorClient,
    resource.id,
    "Percentage CPU",
    "Average",
    timespanDays,
    cache,
  );
  const networkIn = await getMetric(
    monitorClient,
    resource.id,
    "Network In Total",
    "Average",
    timespanDays,
    cache,
  );

  if (cpuUsage !== null && cpuUsage < thresholds.vm.cpuPercent) {
    reason += `Low CPU usage (avg ${cpuUsage.toFixed(2)}%). `;
  }
  if (networkIn !== null && networkIn < thresholds.vm.networkInBytesPerDay) {
    reason += `Low network traffic (${(networkIn / 1024 / 1024).toFixed(2)} MB/day avg). `;
  }

  const result = await enrichWithPricing(
    { costRisk, reason, suspectedUnused: reason.length > 0 },
    resource,
    computeClient,
    resourceGroupName,
    vmName,
    pricing,
  );
  verboseLogAnalysisResult(verbose, result);
  return result;
}

/**
 * Best-effort enrichment of a VM analysis result with the estimated
 * monthly cost recoverable by removing/right-sizing the resource.
 *
 * No-op when:
 *  - the result is not flagged as suspected unused
 *  - no pricing facade was provided
 *  - the VM SKU or region cannot be determined
 *  - the Retail Prices lookup returns no matching meter
 *
 * Any error along the way is logged at warn level and swallowed so the
 * main analysis never fails because of a pricing problem.
 */
async function enrichWithPricing(
  result: AnalysisResult,
  resource: armResources.GenericResource,
  computeClient: VMComputeClientLike,
  resourceGroupName: string,
  vmName: string,
  pricing?: VMPricing,
): Promise<AnalysisResult> {
  if (!pricing || !result.suspectedUnused) {
    return result;
  }
  try {
    const details = await computeClient.virtualMachines.get(
      resourceGroupName,
      vmName,
    );
    const armSkuName = details.hardwareProfile?.vmSize;
    const armRegionName = details.location ?? resource.location;
    if (!armSkuName || !armRegionName) {
      return result;
    }
    const os = details.storageProfile?.osDisk?.osType?.toLowerCase();
    const estimatedMonthlyCostAtRisk = await pricing.resolveVm({
      armRegionName,
      armSkuName,
      os: os === "windows" ? "windows" : "linux",
    });
    if (!estimatedMonthlyCostAtRisk) {
      return result;
    }
    return { ...result, estimatedMonthlyCostAtRisk };
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to enrich VM ${vmName} with pricing: ${error instanceof Error ? error.message : error}`,
    );
    return result;
  }
}
