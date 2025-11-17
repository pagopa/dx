/**
 * Azure Container App analysis
 */

import type { ContainerAppsAPIClient } from "@azure/arm-appcontainers";
import type { MonitorClient } from "@azure/arm-monitor";

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
 * Analyzes an Azure Container App for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param containerAppsClient - Azure Container Apps client for details
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to analyze metrics
 * @param verbose - Enable verbose logging
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeContainerApp(
  resource: armResources.GenericResource,
  containerAppsClient: ContainerAppsAPIClient,
  monitorClient: MonitorClient,
  timespanDays: number,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Container App (Microsoft.App/containerApps)",
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

  const resourceParts = resource.id.split("/");
  const resourceGroupName = resourceParts[4];
  const containerAppName = resourceParts[8];

  try {
    const appDetails = await containerAppsClient.containerApps.get(
      resourceGroupName,
      containerAppName,
    );

    verboseLog(verbose, "Container App API details:", appDetails);

    reason = checkRunningStatus(
      {
        properties: {
          provisioningState: appDetails.provisioningState,
          runningStatus: appDetails.runningStatus,
          template: appDetails.template,
        },
      },
      reason,
      verbose,
    );
    reason = await checkResourceMetrics(
      resource,
      monitorClient,
      timespanDays,
      reason,
      verbose,
    );
    reason = await checkNetworkMetrics(
      resource,
      monitorClient,
      timespanDays,
      reason,
      verbose,
    );

    if (appDetails.managedEnvironmentId?.includes("managedEnvironments")) {
      const cpuUsage = await getMetric(
        monitorClient,
        resource.id,
        "UsageNanoCores",
        "Average",
        timespanDays,
      );
      if (cpuUsage !== null && cpuUsage < 1000000) {
        reason +=
          "Consumption-based Container App with minimal resource usage. ";
      }
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get Container App details for ${containerAppName}: ${error instanceof Error ? error.message : error}`,
    );
    reason += "Could not retrieve detailed Container App information. ";
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}

/**
 * Checks network traffic metrics for a Container App.
 */
async function checkNetworkMetrics(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
  reason: string,
  verbose: boolean,
): Promise<string> {
  let newReason = reason;

  if (!resource.id) {
    return newReason;
  }

  verboseLog(verbose, "Checking network metrics...");

  const networkIn = await getMetric(
    monitorClient,
    resource.id,
    "RxBytes",
    "Total",
    timespanDays,
  );

  const networkOut = await getMetric(
    monitorClient,
    resource.id,
    "TxBytes",
    "Total",
    timespanDays,
  );

  verboseLog(
    verbose,
    `Network In: ${networkIn !== null ? `${(networkIn / 1048576).toFixed(2)} MB` : "N/A"}`,
  );
  verboseLog(
    verbose,
    `Network Out: ${networkOut !== null ? `${(networkOut / 1048576).toFixed(2)} MB` : "N/A"}`,
  );

  if (
    networkIn !== null &&
    networkOut !== null &&
    networkIn + networkOut < 1048576
  ) {
    newReason += `Very low network traffic (${((networkIn + networkOut) / 1048576).toFixed(2)} MB). `;
  }

  return newReason;
}

/**
 * Checks resource usage metrics for a Container App.
 */
async function checkResourceMetrics(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
  reason: string,
  verbose: boolean,
): Promise<string> {
  let newReason = reason;

  if (!resource.id) {
    return newReason;
  }

  verboseLog(verbose, "Checking resource usage metrics...");

  const cpuUsage = await getMetric(
    monitorClient,
    resource.id,
    "UsageNanoCores",
    "Average",
    timespanDays,
  );

  const memoryUsage = await getMetric(
    monitorClient,
    resource.id,
    "WorkingSetBytes",
    "Average",
    timespanDays,
  );

  verboseLog(
    verbose,
    `CPU Usage: ${cpuUsage !== null ? `${(cpuUsage / 1000000000).toFixed(4)} cores` : "N/A"}`,
  );
  verboseLog(
    verbose,
    `Memory Usage: ${memoryUsage !== null ? `${(memoryUsage / 1048576).toFixed(2)} MB` : "N/A"}`,
  );

  if (cpuUsage !== null && cpuUsage < 1000000) {
    newReason += `Very low CPU usage (${(cpuUsage / 1000000000).toFixed(4)} cores). `;
  }

  if (memoryUsage !== null && memoryUsage < 10485760) {
    newReason += `Very low memory usage (${(memoryUsage / 1048576).toFixed(2)} MB). `;
  }

  return newReason;
}

/**
 * Checks the running status of a Container App.
 */
function checkRunningStatus(
  appDetails: {
    properties?: {
      provisioningState?: string;
      runningStatus?: string;
      template?: { scale?: { maxReplicas?: number; minReplicas?: number } };
    };
  },
  reason: string,
  verbose: boolean,
): string {
  let newReason = reason;

  verboseLog(verbose, "Checking running status...");

  const { provisioningState, runningStatus, template } =
    appDetails.properties || {};

  verboseLog(verbose, `Provisioning State: ${provisioningState || "N/A"}`);
  verboseLog(verbose, `Running Status: ${runningStatus || "N/A"}`);
  verboseLog(verbose, `Min Replicas: ${template?.scale?.minReplicas ?? "N/A"}`);
  verboseLog(verbose, `Max Replicas: ${template?.scale?.maxReplicas ?? "N/A"}`);

  if (provisioningState === "Succeeded" && runningStatus !== "Running") {
    newReason += "Container App is not running. ";
  }

  const minReplicas = template?.scale?.minReplicas;
  const maxReplicas = template?.scale?.maxReplicas;
  if (minReplicas === 0 && maxReplicas === 0) {
    newReason += "Container App has 0 replicas configured. ";
  }

  return newReason;
}
