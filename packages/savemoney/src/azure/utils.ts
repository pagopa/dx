/**
 * Azure utility functions for debugging and metrics
 */

import type { MonitorClient } from "@azure/arm-monitor";

import type { AnalysisResult } from "../types.js";

let DEBUG_MODE = false;

/**
 * Logs a debug message, optionally with an object.
 *
 * @param message - The message to log
 * @param object - Optional object to stringify and log
 */
export function debugLog(message: string, object?: unknown) {
  if (DEBUG_MODE) {
    if (object !== undefined) {
      console.log(message, JSON.stringify(object, null, 2));
    } else {
      console.log(message);
    }
  }
}

/**
 * Logs the analysis result for a resource.
 *
 * @param result - The analysis result object
 */
export function debugLogAnalysisResult(result: AnalysisResult) {
  if (DEBUG_MODE) {
    console.log("\n📊 ANALYSIS RESULT:");
    console.log(`   Cost Risk: ${result.costRisk.toUpperCase()}`);
    console.log(
      `   Suspected Unused: ${result.suspectedUnused ? "YES" : "NO"}`,
    );
    console.log(`   Reason: ${result.reason || "No issues found"}`);
    console.log("=".repeat(80) + "\n");
  }
}

/**
 * Logs a resource analysis header with visual separator.
 *
 * @param resourceName - Name of the resource being analyzed
 * @param resourceType - Type of the resource
 */
export function debugLogResourceStart(
  resourceName: string,
  resourceType: string,
) {
  if (DEBUG_MODE) {
    console.log("\n" + "=".repeat(80));
    console.log(`🔍 ANALYZING: ${resourceName}`);
    console.log(`   Type: ${resourceType}`);
    console.log("=".repeat(80));
  }
}

/**
 * Fetches a specific metric for a resource from Azure Monitor.
 *
 * @param monitorClient - The Azure Monitor client instance
 * @param resourceId - The Azure resource ID
 * @param metricName - The name of the metric to fetch (e.g., "Percentage CPU")
 * @param aggregation - The aggregation type (e.g., "Average", "Total")
 * @param timespanDays - Number of days to look back for metrics
 * @returns The metric value or null if unavailable
 */
export async function getMetric(
  monitorClient: MonitorClient,
  resourceId: string,
  metricName: string,
  aggregation: string,
  timespanDays: number,
): Promise<null | number> {
  try {
    const timespan = `P${timespanDays}D`;
    const result = await monitorClient.metrics.list(resourceId, {
      aggregation,
      metricnames: metricName,
      timespan,
    });

    const metricData = result.value[0]?.timeseries?.[0]?.data?.[0];
    if (!metricData) {
      return null;
    }

    const aggregationLower = aggregation.toLowerCase();

    if (
      aggregationLower === "average" &&
      typeof metricData.average === "number"
    ) {
      return metricData.average;
    }
    if (aggregationLower === "total" && typeof metricData.total === "number") {
      return metricData.total;
    }
    if (
      aggregationLower === "minimum" &&
      typeof metricData.minimum === "number"
    ) {
      return metricData.minimum;
    }
    if (
      aggregationLower === "maximum" &&
      typeof metricData.maximum === "number"
    ) {
      return metricData.maximum;
    }
    if (aggregationLower === "count" && typeof metricData.count === "number") {
      return metricData.count;
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to fetch metric ${metricName} for resource ${resourceId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Sets the debug mode for logging.
 * @param enabled - Whether debug logging should be enabled
 */
export function setDebugMode(enabled: boolean) {
  DEBUG_MODE = enabled;
}
