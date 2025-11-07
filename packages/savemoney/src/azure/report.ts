/**
 * Azure report generation
 */

import * as yaml from "js-yaml";
import { table } from "table";

import type {
  AzureDetailedResourceReport,
  AzureResourceReport,
} from "./types.js";

/**
 * Generates a report from Azure resource analysis in the specified format.
 *
 * @param report - Array of detailed resource reports
 * @param format - Output format (table, json, yaml, or detailed-json)
 */
export async function generateReport(
  report: AzureDetailedResourceReport[],
  format: "detailed-json" | "json" | "table" | "yaml",
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
  } else if (format === "yaml") {
    console.log(yaml.dump(summaryReport));
  } else {
    const tableData = [
      ["Name", "Type", "Resource Group", "Risk", "Unused", "Reason"],
      ...summaryReport.map((r) => [
        r.name,
        r.type,
        r.resourceGroup || "N/A",
        r.costRisk,
        r.suspectedUnused ? "Yes" : "No",
        r.reason,
      ]),
    ];

    const output = table(tableData);
    console.log(output);
  }
}
