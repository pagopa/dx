/**
 * Azure Static Web App analysis
 */

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
 * Analyzes an Azure Static Web App for potential cost optimization.
 *
 * @param resource - The Azure resource object
 * @param monitorClient - Azure Monitor client for metrics
 * @param timespanDays - Number of days to analyze metrics
 * @param verbose - Enable verbose logging
 * @returns Analysis result with cost risk and reason
 */
export async function analyzeStaticSite(
  resource: armResources.GenericResource,
  monitorClient: MonitorClient,
  timespanDays: number,
  verbose = false,
): Promise<AnalysisResult> {
  verboseLogResourceStart(
    verbose,
    resource.name || "unknown",
    "Static Web App (Microsoft.Web/staticSites)",
  );
  verboseLog(verbose, "Resource details:", resource);

  const costRisk: "high" | "low" | "medium" = "low";
  let reason = "";

  if (!resource.id) {
    return {
      costRisk,
      reason: "Resource ID is missing.",
      suspectedUnused: false,
    };
  }

  try {
    verboseLog(verbose, "Checking metrics...");

    // Check for site hits (requests to the static site)
    // Note: Static Web Apps metrics use Total aggregation, not Average
    // Ref. https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-staticsites-metrics
    const siteHits = await getMetric(
      monitorClient,
      resource.id,
      "SiteHits",
      "Total",
      timespanDays,
    );

    const bytesSent = await getMetric(
      monitorClient,
      resource.id,
      "BytesSent",
      "Total",
      timespanDays,
    );

    verboseLog(
      verbose,
      `Site Hits: ${siteHits !== null ? `${siteHits.toFixed(0)} total requests` : "N/A"}`,
    );
    verboseLog(
      verbose,
      `Bytes Sent: ${bytesSent !== null ? `${(bytesSent / 1024 / 1024).toFixed(2)} MB total` : "N/A"}`,
    );

    // If both metrics are null, it means no data points exist (no traffic at all)
    if (siteHits === null && bytesSent === null) {
      reason += `No traffic data available in ${timespanDays} days. `;
    } else {
      if (siteHits !== null && siteHits < 100) {
        // Less than 100 requests total in 30 days (< 3.3 requests/day)
        reason += `Very low site traffic (${siteHits.toFixed(0)} requests in ${timespanDays} days). `;
      }

      if (bytesSent !== null && bytesSent < 1048576) {
        // Less than 1MB total in 30 days (< 34KB/day)
        reason += `Very low data transfer (${(bytesSent / 1024 / 1024).toFixed(2)} MB in ${timespanDays} days). `;
      }
    }
  } catch (error) {
    const logger = getLogger(["savemoney", "azure"]);
    logger.warn(
      `Failed to get metrics for Static Web App ${resource.name}: ${error instanceof Error ? error.message : error}`,
    );
  }

  const suspectedUnused = reason.length > 0;
  const result = { costRisk, reason: reason.trim(), suspectedUnused };
  verboseLogAnalysisResult(verbose, result);
  return result;
}
