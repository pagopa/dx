/**
 * Azure report generation
 */

import type {
  AzureDetailedResourceReport,
  AzureResourceReport,
} from "./types.js";

/**
 * Generates a report from Azure resource analysis in the specified format.
 *
 * @param report - Array of detailed resource reports
 * @param format - Output format (table, json, or detailed-json)
 */
export async function generateReport(
  report: AzureDetailedResourceReport[],
  format: "detailed-json" | "json" | "table",
) {
  if (format === "detailed-json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // For other formats, we extract the summary data.
  const summaryReport: AzureResourceReport[] = report.map((r) => ({
    costRisk: r.analysis.costRisk,
    location: r.resource.location ?? "",
    name: r.resource.name ?? "unknown",
    reason: r.analysis.reason,
    resourceGroup: r.resource.id?.split("/")[4],
    subscriptionId: r.resource.id?.split("/")[2] ?? "unknown",
    suspectedUnused: r.analysis.suspectedUnused,
    type: r.resource.type ?? "unknown",
  }));

  if (format === "json") {
    console.log(JSON.stringify(summaryReport, null, 2));
  } else {
    console.table(
      summaryReport.map((r) => ({
        Name: r.name,
        Reason: r.reason,
        "Resource Group": r.resourceGroup || "N/A",
        Risk: r.costRisk,
        Type: r.type,
        Unused: r.suspectedUnused ? "Yes" : "No",
      })),
      ["Name", "Type", "Resource Group", "Risk", "Unused", "Reason"],
    );
  }
}
