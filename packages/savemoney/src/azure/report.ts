/**
 * Azure report generation
 */

import Table from "cli-table3";

import type { Money } from "../finding.js";
import type {
  AzureDetailedResourceReport,
  AzureResourceReport,
} from "./types.js";

// Fixed column widths — keeps the Reason column within a readable width
// while allowing cli-table3 to word-wrap long content across multiple lines.
const COL_WIDTHS = [30, 35, 25, 8, 55] as const;

// ANSI color codes — only applied when stdout is a TTY to avoid cluttering redirected output
const isTTY = process.stdout.isTTY ?? false;
const RED = isTTY ? "\x1b[31m" : "";
const YELLOW = isTTY ? "\x1b[33m" : "";
const BLUE = isTTY ? "\x1b[34m" : "";
const GREEN = isTTY ? "\x1b[32m" : "";
const CYAN = isTTY ? "\x1b[36m" : "";
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

type Summary = {
  counts: { high: number; low: number; medium: number };
  savingsByCurrency: Map<string, number>;
  sourceCounts: Record<string, number>;
};

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

  if (format === "json") {
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
    console.log(JSON.stringify(summaryReport, null, 2));
  } else if (format === "lint") {
    generateLintReport(report);
  } else {
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
    const table = new Table({
      colWidths: [...COL_WIDTHS],
      head: ["Name", "Type", "Resource Group", "Risk", "Reason"],
      wordWrap: true,
    });
    for (const r of summaryReport) {
      table.push([
        r.name,
        r.type,
        r.resourceGroup || "N/A",
        r.costRisk,
        r.reason,
      ]);
    }
    console.log(table.toString());
    // Same summary block the lint format prints, so the table view also
    // surfaces totals, source breakdown and estimated savings at a glance.
    printSummary(computeSummary(report));
  }
}

/**
 * Walks the report once to compute totals, source breakdown and savings
 * per currency without mutating it. Used by the table format, which has
 * no per-line walk of its own.
 */
function computeSummary(report: AzureDetailedResourceReport[]): Summary {
  const summary: Summary = {
    counts: { high: 0, low: 0, medium: 0 },
    savingsByCurrency: new Map(),
    sourceCounts: {},
  };
  for (const entry of report) {
    const lines = entry.findings?.length
      ? entry.findings.map((f) => ({
          savings: f.estimatedMonthlySavings,
          severity: f.severity,
          source: f.source,
        }))
      : splitReasons(entry.analysis.reason).map(() => ({
          savings: undefined,
          severity: entry.analysis.costRisk,
          source: "custom" as const,
        }));
    for (const line of lines) {
      summary.counts[line.severity]++;
      summary.sourceCounts[line.source] =
        (summary.sourceCounts[line.source] ?? 0) + 1;
      if (line.savings) {
        summary.savingsByCurrency.set(
          line.savings.currency,
          (summary.savingsByCurrency.get(line.savings.currency) ?? 0) +
            line.savings.amount,
        );
      }
    }
  }
  return summary;
}

/**
 * Formats a monetary amount with an ISO 4217 currency code, falling back
 * to the raw code prefix when the runtime locale data lacks the currency
 * symbol.
 */
function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Renders an estimated monthly savings value as the short "(€ 12.50/mo)"
 * label that ships next to each lint line. Returns an empty string when
 * the analyzer didn't provide an estimate.
 */
function formatSavings(savings: Money | undefined): string {
  if (!savings) return "";
  return `(${formatAmount(savings.amount, savings.currency)}/mo)`;
}

/**
 * Renders a linter-style report to stdout, grouping findings by resource.
 *
 * When `Finding[]` is attached to a report (Phase 1+), each finding is
 * rendered with its `source` badge (e.g. `[advisor]`) and the estimated
 * monthly savings, when known. For older payloads without `findings` we
 * fall back to splitting `analysis.reason` like before so the format stays
 * backward compatible.
 *
 * Example output:
 *
 *   /subscriptions/.../virtualMachines/my-vm
 *     ✖ HIGH    [advisor] Right-size your VM. (€ 12.50/mo)
 *     ✖ HIGH    [custom]  No tags found.
 *
 *   Summary: 3 issues found  (2 high, 0 medium, 1 low)
 *   Estimated monthly savings: € 12.50
 */
function generateLintReport(report: AzureDetailedResourceReport[]): void {
  const summary = {
    counts: { high: 0, low: 0, medium: 0 },
    savingsByCurrency: new Map<string, number>(),
    sourceCounts: {} as Record<string, number>,
  };

  for (const entry of report) {
    const resourceId =
      entry.resource.id ?? `unknown/${entry.resource.name ?? "unknown"}`;
    console.log(`${BOLD}${resourceId}${RESET}`);

    const lines = entry.findings?.length
      ? entry.findings.map((f) => ({
          extra: formatSavings(f.estimatedMonthlySavings),
          severity: f.severity,
          source: f.source,
          text: f.reason,
        }))
      : splitReasons(entry.analysis.reason).map((text) => ({
          extra: "",
          severity: entry.analysis.costRisk,
          source: "custom" as const,
          text,
        }));

    for (const line of lines) {
      const icon = RISK_ICON[line.severity];
      const color = RISK_COLOR[line.severity];
      const label = `${color}${line.severity.toUpperCase().padEnd(6)}${RESET}`;
      const sourceBadge = `${CYAN}[${line.source}]${RESET}`;
      const extra = line.extra ? ` ${GREEN}${line.extra}${RESET}` : "";
      console.log(
        `  ${icon} ${label}  ${sourceBadge} ${DIM}${line.text}${RESET}${extra}`,
      );
      summary.counts[line.severity]++;
      summary.sourceCounts[line.source] =
        (summary.sourceCounts[line.source] ?? 0) + 1;
    }

    if (entry.findings) {
      for (const f of entry.findings) {
        if (f.estimatedMonthlySavings) {
          const { amount, currency } = f.estimatedMonthlySavings;
          summary.savingsByCurrency.set(
            currency,
            (summary.savingsByCurrency.get(currency) ?? 0) + amount,
          );
        }
      }
    }

    console.log();
  }

  printSummary(summary);
}

/**
 * Prints the shared trailer (issues, sources, estimated savings) used by
 * both the lint and the table format.
 *
 * Savings are kept grouped by currency intentionally: Azure Advisor
 * returns each recommendation in the subscription's native billing
 * currency, so the same report can carry EUR and USD figures at the
 * same time when subscriptions are billed in different regions. We do
 * NOT convert across currencies — the rates would be both volatile and
 * out of scope for this tool.
 */
function printSummary(summary: Summary): void {
  const { counts, savingsByCurrency, sourceCounts } = summary;
  const total = counts.high + counts.medium + counts.low;
  const summaryLine =
    `${BOLD}Summary:${RESET} ${total} issue${total !== 1 ? "s" : ""} found` +
    `  ${RED}(${counts.high} high${RESET}` +
    `, ${YELLOW}${counts.medium} medium${RESET}` +
    `, ${BLUE}${counts.low} low${RESET})`;
  console.log(summaryLine);

  const sourceBreakdown = Object.entries(sourceCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, n]) => `${n} ${source}`)
    .join(", ");
  if (sourceBreakdown) {
    console.log(`${BOLD}Sources:${RESET} ${sourceBreakdown}`);
  }

  if (savingsByCurrency.size > 0) {
    const parts = [...savingsByCurrency.entries()].map(
      ([currency, amount]) =>
        `${GREEN}${formatAmount(amount, currency)}${RESET}`,
    );
    console.log(
      `${BOLD}Estimated monthly savings:${RESET} ${parts.join(", ")}`,
    );
  }
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
