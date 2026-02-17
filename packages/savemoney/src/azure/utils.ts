/**
 * Azure utility functions for debugging and metrics
 */

import type { MonitorClient } from "@azure/arm-monitor";

import { getLogger } from "@logtape/logtape";

import type { AnalysisResult } from "../types.js";

type MetricDataPoint = {
  average?: number;
  count?: number;
  maximum?: number;
  minimum?: number;
  total?: number;
};

/**
 * Aggregates metric data points based on aggregation type.
 *
 * @param dataPoints - Array of metric data points
 * @param aggregation - The aggregation type (e.g., "Average", "Total")
 * @returns The aggregated value or null if unavailable
 */
export function aggregateDataPoints(
  dataPoints: MetricDataPoint[],
  aggregation: string,
): null | number {
  const aggregationLower = aggregation.toLowerCase();

  // Get all non-null values from the data points
  const values = dataPoints
    .map((dataPoint) => extractAggregatedValue(dataPoint, aggregation))
    .filter((v): v is number => v !== null);

  if (values.length === 0) {
    return null;
  }

  if (aggregationLower === "total" || aggregationLower === "count") {
    // Sum all values for Total/Count
    return values.reduce((sum, v) => sum + v, 0);
  }

  if (aggregationLower === "average") {
    // Calculate the average of all values
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  if (aggregationLower === "maximum") {
    // Find the maximum value
    return Math.max(...values);
  }

  if (aggregationLower === "minimum") {
    // Find the minimum value
    return Math.min(...values);
  }

  return null;
}

/**
 * Extracts the aggregated value from metric data.
 *
 * @param metricData - The metric data point
 * @param aggregation - The aggregation type (e.g., "Average", "Total")
 * @returns The aggregated value or null if unavailable
 */
export function extractAggregatedValue(
  metricData: MetricDataPoint,
  aggregation: string,
): null | number {
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

    if (result.value.length === 0) {
      return null;
    }

    const metric = result.value[0];

    if (!metric.timeseries || metric.timeseries.length === 0) {
      return null;
    }

    const timeserie = metric.timeseries[0];

    if (!timeserie.data || timeserie.data.length === 0) {
      return null;
    }

    const aggregatedValue = aggregateDataPoints(
      timeserie.data as MetricDataPoint[],
      aggregation,
    );

    return aggregatedValue;
  } catch (error) {
    const logger = getLogger(["savemoney", "azure", "metrics"]);
    logger.error(
      `Failed to fetch metric ${metricName} for resource ${resourceId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Logs a verbose message, optionally with an object.
 *
 * @param verbose - Whether verbose logging is enabled
 * @param message - The message to log
 * @param object - Optional object to stringify and log
 */
export function verboseLog(
  verbose: boolean,
  message: string,
  object?: unknown,
) {
  if (verbose) {
    const logger = getLogger(["savemoney", "azure", "verbose"]);
    if (object !== undefined) {
      logger.debug(`${message} ${JSON.stringify(object, null, 2)}`);
    } else {
      logger.debug(message);
    }
  }
}

/**
 * Logs the analysis result for a resource.
 *
 * @param verbose - Whether verbose logging is enabled
 * @param result - The analysis result object
 */
export function verboseLogAnalysisResult(
  verbose: boolean,
  result: AnalysisResult,
) {
  if (verbose) {
    const logger = getLogger(["savemoney", "azure", "verbose"]);
    logger.debug("\n📊 ANALYSIS RESULT:");
    logger.debug(`   Cost Risk: ${result.costRisk.toUpperCase()}`);
    logger.debug(
      `   Suspected Unused: ${result.suspectedUnused ? "YES" : "NO"}`,
    );
    logger.debug(`   Reason: ${result.reason || "No issues found"}`);
    logger.debug("=".repeat(80) + "\n");
  }
}

/**
 * Logs a resource analysis header with visual separator.
 *
 * @param verbose - Whether verbose logging is enabled
 * @param resourceName - Name of the resource being analyzed
 * @param resourceType - Type of the resource
 */
export function verboseLogResourceStart(
  verbose: boolean,
  resourceName: string,
  resourceType: string,
) {
  if (verbose) {
    const logger = getLogger(["savemoney", "azure", "verbose"]);
    logger.debug("\n" + "=".repeat(80));
    logger.debug(`🔍 ANALYZING: ${resourceName}`);
    logger.debug(`   Type: ${resourceType}`);
    logger.debug("=".repeat(80));
  }
}
