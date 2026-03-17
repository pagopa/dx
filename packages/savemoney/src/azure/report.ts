/**
 * Azure report generation
 */

import type {
  AzureDetailedResourceReport,
  AzureResourceReport,
} from "./types.js";

// ANSI color codes — only applied when stdout is a TTY to avoid cluttering redirected output
const isTTY = process.stdout.isTTY ?? false;
const RED = isTTY ? "\x1b[31m" : "";
const YELLOW = isTTY ? "\x1b[33m" : "";
const BLUE = isTTY ? "\x1b[34m" : "";
const BOLD = isTTY ? "\x1b[1m" : "";
const RESET = isTTY ? "\x1b[0m" : "";
const DIM = isTTY ? "\x1b[2m" : "";

const RISK_ICON = {
  high: `${RED}✖${RESET}`,
  low: `${BLUE}ℹ${RESET}`,
  medium: `${YELLOW}⚠${RESET}`,
} as const;

const RISK_COLOR = {
  high: RED,
  low: BLUE,
  medium: YELLOW,
} as const;

/**
 * Generates a report from Azure resource analysis in the specified format.
 *
 * @param report - Array of detailed resource reports
 * @param format - Output format (table, json, detailed-json, or lint)
 */
export async function generateReport(
  report: AzureDetailedResourceReport[],
  format: "detailed-json" | "json" | "lint" | "table",
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
  } else if (format === "lint") {
    generateLintReport(report);
  } else {
    console.table(
      summaryReport.map((r) => ({
        Name: r.name,
        Reason: r.reason,
        "Resource Group": r.resourceGroup || "N/A",
        Risk: r.costRisk,
        Type: r.type,
      })),
      ["Name", "Type", "Resource Group", "Risk", "Reason"],
    );
  }
}

/**
 * Renders a linter-style report to stdout, grouping findings by resource.
 *
 * Example output:
 *
 *   /subscriptions/.../virtualMachines/my-vm
 *     ✖ HIGH    VM is deallocated.
 *     ✖ HIGH    No tags found.
 *
 *   Summary: 3 issues found  (2 high, 0 medium, 1 low)
 */
function generateLintReport(report: AzureDetailedResourceReport[]): void {
  const counts = { high: 0, low: 0, medium: 0 };

  for (const entry of report) {
    const resourceId =
      entry.resource.id ?? `unknown/${entry.resource.name ?? "unknown"}`;
    const risk = entry.analysis.costRisk;
    const findings = splitReasons(entry.analysis.reason);

    console.log(`${BOLD}${resourceId}${RESET}`);

    for (const finding of findings) {
      const icon = RISK_ICON[risk];
      const color = RISK_COLOR[risk];
      const label = `${color}${risk.toUpperCase().padEnd(6)}${RESET}`;
      console.log(`  ${icon} ${label}  ${DIM}${finding}${RESET}`);
      counts[risk]++;
    }

    console.log();
  }

  const total = counts.high + counts.medium + counts.low;
  const summaryLine =
    `${BOLD}Summary:${RESET} ${total} issue${total !== 1 ? "s" : ""} found` +
    `  ${RED}(${counts.high} high${RESET}` +
    `, ${YELLOW}${counts.medium} medium${RESET}` +
    `, ${BLUE}${counts.low} low${RESET})`;

  console.log(summaryLine);
}

/**
 * Splits a concatenated reason string (sentences separated by ". ") into
 * individual finding strings, stripping trailing whitespace.
 */
function splitReasons(reason: string): string[] {
  return reason
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(".") ? s : `${s}.`));
}
