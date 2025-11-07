/**
 * Azure Storage Account analysis
 */

import type { MonitorClient } from "@azure/arm-monitor";

import * as armResources from "@azure/arm-resources";

import type { AnalysisResult } from "../../types.js";

import {
  debugLog,
  debugLogAnalysisResult,
  debugLogResourceStart,
  getMetric,
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
  debug = false,
): Promise<AnalysisResult> {
  debugLogResourceStart(
    debug,
    resource.name || "unknown",
    "Storage Account (microsoft.storage/storageaccounts)",
  );
  debugLog(debug, "Resource details:", resource);

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
    "Total",
    timespanDays,
  );
  if (transactions !== null && transactions < 100) {
    // Very low transactions
    const result = {
      costRisk,
      reason: `Very low transaction count (${transactions}). `,
      suspectedUnused: true,
    };
    debugLogAnalysisResult(debug, result);
    return result;
  }
  const result = { costRisk, reason: "", suspectedUnused: false };
  debugLogAnalysisResult(debug, result);
  return result;
}
