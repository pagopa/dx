/**
 * Azure Virtual Machine analysis
 */

import type { ComputeManagementClient } from "@azure/arm-compute";
import type { MonitorClient } from "@azure/arm-monitor";

import * as armResources from "@azure/arm-resources";

import type { AnalysisResult } from "../../types.js";

import {
  getMetric,
  verboseLog,
  verboseLogAnalysisResult,
  verboseLogResourceStart,
} from "../utils.js";

/**
 * Analyzes an Azure Virtual Machine for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param monitorClient - Azure Monitor client for fetching metrics
 * @param computeClient - Azure Compute client for VM details
 * @param timespanDays - Number of days to analyze metrics
 * @param verbose - Whether verbose logging is enabled
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeVM(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  computeClient: ComputeManagementClient,
  timespanDays: number,
  verbose = false,
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
      const result = {
        costRisk,
        reason: "VM is deallocated. ",
        suspectedUnused: true,
      };
      verboseLogAnalysisResult(verbose, result);
      return result;
    }

    if (vmStatus?.code === "PowerState/stopped") {
      const result = {
        costRisk,
        reason: "VM is stopped. ",
        suspectedUnused: true,
      };
      verboseLogAnalysisResult(verbose, result);
      return result;
    }
  } catch (error) {
    console.warn(
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
  );
  const networkIn = await getMetric(
    monitorClient,
    resource.id,
    "Network In Total",
    "Total",
    timespanDays,
  );

  if (cpuUsage !== null && cpuUsage < 1) {
    // Less than 1% average CPU
    reason += `Low CPU usage (avg ${cpuUsage.toFixed(2)}%). `;
  }
  if (networkIn !== null && networkIn < 1024 * 1024 * 10) {
    // Less than 10MB total network in
    reason += `Low network traffic. `;
  }

  const result = { costRisk, reason, suspectedUnused: reason.length > 0 };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
