/**
 * Azure Storage Account analysis
 */

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
 * Analyzes an Azure Storage Account for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to analyze metrics
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeStorageAccount(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Storage Account (microsoft.storage/storageaccounts)",
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
  const transactions = await getMetric(
    monitorClient,
    resource.id,
    "Transactions",
    "Average",
    timespanDays,
  );
  if (transactions !== null && transactions < 10) {
    // Less than 10 transactions per day on average
    const result = {
      costRisk,
      reason: `Very low transaction count (${transactions.toFixed(2)} avg/day). `,
      suspectedUnused: true,
    };
    verboseLogAnalysisResult(verbose, result);
    return result;
  }
  const result = { costRisk, reason: "", suspectedUnused: false };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
