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
  /**
   * Per-resource cost (i.e. the monthly bill the resource is currently
   * generating) summed across resources flagged as suspected unused by
   * custom analyzers. Represents the UPPER BOUND of what could be saved
   * by removing the resource, NOT the saving of any individual finding.
   */
  costAtRiskByCurrency: Map<string, number>;
  counts: { high: number; low: number; medium: number };
  /**
   * Sum of Advisor's per-finding `extendedProperties.savingsAmount`
   * values. These are authoritative point estimates from Azure ("apply
   * this recommendation and save €X"), so they aggregate cleanly.
   */
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
    costAtRiskByCurrency: new Map(),
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
      if (line.source === "advisor" && line.savings) {
        summary.savingsByCurrency.set(
          line.savings.currency,
          (summary.savingsByCurrency.get(line.savings.currency) ?? 0) +
            line.savings.amount,
        );
      }
    }
    // Per-resource cost: counted ONCE per resource (not per finding) so
    // that a resource with N findings doesn't inflate the total by Nx.
    const costAtRisk = entry.analysis.estimatedMonthlySavings;
    if (costAtRisk) {
      summary.costAtRiskByCurrency.set(
        costAtRisk.currency,
        (summary.costAtRiskByCurrency.get(costAtRisk.currency) ?? 0) +
          costAtRisk.amount,
      );
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
 * Renders an Advisor per-finding monthly saving as the short
 * "(saving: € 12.50/mo)" label that ships next to each lint line.
 * Returns an empty string when the finding doesn't carry an estimate.
 *
 * Only Advisor populates this today: Microsoft attaches an authoritative
 * per-recommendation saving to each recommendation, so it aggregates
 * cleanly. Custom analyzers do NOT propagate the resource's monthly
 * bill down to each finding — see the per-resource "cost at risk"
 * header rendered by `generateLintReport` instead.
 */
function formatPerFindingSavings(savings?: Money): string {
  if (!savings) return "";
  return `(saving: ${formatAmount(savings.amount, savings.currency)}/mo)`;
}

/**
 * Renders a linter-style report to stdout, grouping findings by resource.
 *
 * When `Finding[]` is attached to a report (Phase 1+), each finding is
 * rendered with its `source` badge (e.g. `[advisor]`) and its own
 * estimated monthly saving (when populated by Advisor). For older
 * payloads without `findings` we fall back to splitting `analysis.reason`
 * like before so the format stays backward compatible.
 *
 * When a custom analyzer populated `analysis.estimatedMonthlySavings`,
 * the value is printed ONCE per resource as a header annotation labelled
 * "cost at risk" — it represents the monthly bill of the resource (an
 * upper bound on what could be recovered by removing it), NOT the saving
 * of any individual finding sentence.
 *
 * Example output:
 *
 *   /subscriptions/.../virtualMachines/my-vm  (cost at risk: € 29.94/mo)
 *     ✖ HIGH    [custom]  No tags found.
 *     ✖ HIGH    [custom]  VM is deallocated.
 *
 *   /subscriptions/.../virtualMachines/other-vm
 *     ✖ HIGH    [advisor] Right-size your VM. (saving: € 12.50/mo)
 *
 *   Summary: 3 issues found  (2 high, 0 medium, 1 low)
 *   Estimated monthly cost at risk (custom): € 29.94
 *   Estimated monthly savings (advisor):     € 12.50
 */
function generateLintReport(report: AzureDetailedResourceReport[]): void {
  const summary: Summary = {
    costAtRiskByCurrency: new Map(),
    counts: { high: 0, low: 0, medium: 0 },
    savingsByCurrency: new Map(),
    sourceCounts: {},
  };

  for (const entry of report) {
    const resourceId =
      entry.resource.id ?? `unknown/${entry.resource.name ?? "unknown"}`;
    const costAtRisk = entry.analysis.estimatedMonthlySavings;
    const header = costAtRisk
      ? `${BOLD}${resourceId}${RESET}  ${GREEN}(cost at risk: ${formatAmount(costAtRisk.amount, costAtRisk.currency)}/mo)${RESET}`
      : `${BOLD}${resourceId}${RESET}`;
    console.log(header);
    if (costAtRisk) {
      summary.costAtRiskByCurrency.set(
        costAtRisk.currency,
        (summary.costAtRiskByCurrency.get(costAtRisk.currency) ?? 0) +
          costAtRisk.amount,
      );
    }

    const lines = entry.findings?.length
      ? entry.findings.map((f) => ({
          extra:
            f.source === "advisor"
              ? formatPerFindingSavings(f.estimatedMonthlySavings)
              : "",
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
        if (f.source === "advisor" && f.estimatedMonthlySavings) {
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
  const { costAtRiskByCurrency, counts, savingsByCurrency, sourceCounts } =
    summary;
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

  if (costAtRiskByCurrency.size > 0) {
    const parts = [...costAtRiskByCurrency.entries()].map(
      ([currency, amount]) =>
        `${GREEN}${formatAmount(amount, currency)}${RESET}`,
    );
    console.log(
      `${BOLD}Estimated monthly cost at risk (custom):${RESET} ${parts.join(", ")}`,
    );
  }

  if (savingsByCurrency.size > 0) {
    const parts = [...savingsByCurrency.entries()].map(
      ([currency, amount]) =>
        `${GREEN}${formatAmount(amount, currency)}${RESET}`,
    );
    console.log(
      `${BOLD}Estimated monthly savings (advisor):${RESET} ${parts.join(", ")}`,
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
