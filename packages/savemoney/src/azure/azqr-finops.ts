/**
 * PoC FinOps projection from AZQR and SaveMoney findings.
 *
 * This module intentionally keeps the integration small: it normalizes the
 * AZQR JSON/XLSX-like rows we need and combines them with SaveMoney findings
 * so the CLI can show how AZQR can become an upstream data source.
 */

import { z } from "zod";

import type { Finding, Money } from "../finding.js";
import type { AzureDetailedResourceReport } from "./types.js";

const RowSchema = z.record(z.string(), z.unknown());
const RowsSchema = z.array(RowSchema);

const RawAzqrReportSchema = z
  .object({
    Advisor: RowsSchema.optional(),
    advisor: RowsSchema.optional(),
    impacted: RowsSchema.optional(),
    ImpactedResources: RowsSchema.optional(),
    impactedResources: RowsSchema.optional(),
    Inventory: RowsSchema.optional(),
    inventory: RowsSchema.optional(),
  })
  .passthrough();

export type AzqrAdvisorRecommendation = {
  category: string;
  description: string;
  impact: string;
  recommendationId: string;
  resourceId: string;
  resourceName?: string;
  resourceType?: string;
};

export type AzqrImpactedResource = {
  category: string;
  impact: string;
  learn?: string;
  recommendation: string;
  recommendationId: string;
  resourceGroup?: string;
  resourceId: string;
  resourceName?: string;
  resourceType?: string;
  source: string;
};

export type AzqrInventoryResource = {
  kind?: string;
  location?: string;
  resourceId: string;
  resourceName?: string;
  resourceType?: string;
  skuName?: string;
  skuTier?: string;
  sla?: string;
};

export type AzqrReport = {
  advisor: AzqrAdvisorRecommendation[];
  impactedResources: AzqrImpactedResource[];
  inventory: AzqrInventoryResource[];
};

export type FinOpsOpportunity = {
  action: string;
  category: "cleanup" | "commitment" | "cost-context" | "rightsizing";
  confidence: "high" | "low" | "medium";
  estimatedMonthlySavings?: Money;
  evidence: string[];
  resource: {
    id: string;
    kind?: string;
    location?: string;
    name?: string;
    resourceGroup?: string;
    skuName?: string;
    skuTier?: string;
    type?: string;
  };
  sourceFindings: {
    recommendationId?: string;
    source: "azqr" | "azure-advisor" | "savemoney";
    title: string;
  }[];
};

export type FinOpsReport = {
  opportunities: FinOpsOpportunity[];
  sources: {
    azqr: {
      advisorRows: number;
      impactedRows: number;
      inventoryRows: number;
      opportunityFindings: number;
    };
    azureAdvisor: {
      opportunityFindings: number;
    };
    savemoney: {
      findings: number;
      opportunityFindings: number;
      resourceReports: number;
    };
  };
  summary: {
    estimatedMonthlySavings: Money[];
    opportunities: number;
    withEstimatedSavings: number;
  };
};

// eslint-disable-next-line complexity
export function generateFinOpsReport(args: {
  azqrReport?: AzqrReport;
  savemoneyReports?: AzureDetailedResourceReport[];
}): FinOpsReport {
  const opportunities = new Map<string, FinOpsOpportunity>();
  const inventoryById = indexInventory(args.azqrReport?.inventory ?? []);

  for (const row of args.azqrReport?.impactedResources ?? []) {
    const opportunity = opportunityFromAzqrImpacted(row, inventoryById);
    if (opportunity) {
      mergeOpportunity(opportunities, opportunity);
    }
  }

  for (const row of args.azqrReport?.advisor ?? []) {
    const opportunity = opportunityFromAzqrAdvisor(row, inventoryById);
    if (opportunity) {
      mergeOpportunity(opportunities, opportunity);
    }
  }

  for (const report of args.savemoneyReports ?? []) {
    for (const finding of report.findings ?? []) {
      const opportunity = opportunityFromFinding(finding, report);
      if (opportunity) {
        mergeOpportunity(opportunities, opportunity);
      }
    }
  }

  const sorted = [...opportunities.values()].sort(compareOpportunities);
  const sourceFindings = countSourceFindings(sorted);
  return {
    opportunities: sorted,
    sources: {
      azqr: {
        advisorRows: args.azqrReport?.advisor.length ?? 0,
        impactedRows: args.azqrReport?.impactedResources.length ?? 0,
        inventoryRows: args.azqrReport?.inventory.length ?? 0,
        opportunityFindings: sourceFindings.azqr ?? 0,
      },
      azureAdvisor: {
        opportunityFindings: sourceFindings["azure-advisor"] ?? 0,
      },
      savemoney: {
        findings:
          args.savemoneyReports?.reduce(
            (total, report) => total + (report.findings?.length ?? 0),
            0,
          ) ?? 0,
        opportunityFindings: sourceFindings.savemoney ?? 0,
        resourceReports: args.savemoneyReports?.length ?? 0,
      },
    },
    summary: {
      estimatedMonthlySavings: summarizeSavings(sorted),
      opportunities: sorted.length,
      withEstimatedSavings: sorted.filter((o) => o.estimatedMonthlySavings)
        .length,
    },
  };
}

/**
 * Parses the most useful parts of AZQR JSON output.
 *
 * AZQR JSON shape may evolve; this PoC accepts the real `azqr scan --json`
 * keys and the sheet-like names from the Excel workbook converted to JSON.
 */
export function parseAzqrReport(raw: unknown): AzqrReport {
  const parsed = RawAzqrReportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid AZQR report:\n${z.prettifyError(parsed.error)}`, {
      cause: parsed.error,
    });
  }

  const data = parsed.data;
  return {
    advisor: (data.Advisor ?? data.advisor ?? []).flatMap((row) =>
      normalizeAdvisor(row),
    ),
    impactedResources: (
      data.ImpactedResources ??
      data.impactedResources ??
      data.impacted ??
      []
    ).flatMap((row) => normalizeImpactedResource(row)),
    inventory: (data.Inventory ?? data.inventory ?? []).flatMap((row) =>
      normalizeInventory(row),
    ),
  };
}

function compareOpportunities(
  left: FinOpsOpportunity,
  right: FinOpsOpportunity,
): number {
  const leftSavings = left.estimatedMonthlySavings?.amount ?? 0;
  const rightSavings = right.estimatedMonthlySavings?.amount ?? 0;
  if (leftSavings !== rightSavings) {
    return rightSavings - leftSavings;
  }
  return left.resource.id.localeCompare(right.resource.id);
}

function countSourceFindings(
  opportunities: FinOpsOpportunity[],
): Partial<
  Record<FinOpsOpportunity["sourceFindings"][number]["source"], number>
> {
  const counts: Partial<
    Record<FinOpsOpportunity["sourceFindings"][number]["source"], number>
  > = {};
  for (const opportunity of opportunities) {
    for (const finding of opportunity.sourceFindings) {
      counts[finding.source] = (counts[finding.source] ?? 0) + 1;
    }
  }
  return counts;
}

function createOpportunity(args: {
  action: string;
  category: FinOpsOpportunity["category"];
  confidence: FinOpsOpportunity["confidence"];
  estimatedMonthlySavings?: Money;
  evidence: string[];
  inventory?: AzqrInventoryResource;
  resource: {
    id: string;
    name?: string;
    resourceGroup?: string;
    type?: string;
  };
  sourceFinding: FinOpsOpportunity["sourceFindings"][number];
}): FinOpsOpportunity {
  const { inventory, resource } = args;
  return {
    action: args.action,
    category: args.category,
    confidence: args.confidence,
    estimatedMonthlySavings: args.estimatedMonthlySavings,
    evidence: args.evidence,
    resource: {
      id: resource.id,
      kind: inventory?.kind,
      location: inventory?.location,
      name: resource.name ?? inventory?.resourceName,
      resourceGroup: resource.resourceGroup,
      skuName: inventory?.skuName,
      skuTier: inventory?.skuTier,
      type: resource.type ?? inventory?.resourceType,
    },
    sourceFindings: [args.sourceFinding],
  };
}

function getString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }
  return "";
}

function indexInventory(
  rows: AzqrInventoryResource[],
): Map<string, AzqrInventoryResource> {
  return new Map(rows.map((row) => [row.resourceId.toLowerCase(), row]));
}

function isCleanupRecommendation(text: string): boolean {
  return /not attached|not associated|not related|without resources|without endpoints|without connected devices|without delegation|empty backend|unattached|orphan|unused/i.test(
    text,
  );
}

function isCostRecommendation(category: string, text: string): boolean {
  return (
    category.toLowerCase() === "cost" ||
    /reserved instance|savings plan|cost effective|save over|lower prices/i.test(
      text,
    )
  );
}

function mergeOpportunity(
  opportunities: Map<string, FinOpsOpportunity>,
  incoming: FinOpsOpportunity,
): void {
  const key = `${incoming.resource.id.toLowerCase()}::${incoming.action}`;
  const existing = opportunities.get(key);
  if (!existing) {
    opportunities.set(key, incoming);
    return;
  }

  const savings =
    existing.estimatedMonthlySavings ?? incoming.estimatedMonthlySavings;
  opportunities.set(key, {
    ...existing,
    estimatedMonthlySavings: savings,
    evidence: [...new Set([...existing.evidence, ...incoming.evidence])],
    sourceFindings: [
      ...existing.sourceFindings,
      ...incoming.sourceFindings.filter(
        (candidate) =>
          !existing.sourceFindings.some(
            (current) =>
              current.source === candidate.source &&
              current.recommendationId === candidate.recommendationId &&
              current.title === candidate.title,
          ),
      ),
    ],
  });
}

function normalizeAdvisor(
  row: Record<string, unknown>,
): AzqrAdvisorRecommendation[] {
  const resourceId = getString(row, ["Resource Id", "resourceId", "id"]);
  const description = getString(row, ["Description", "description"]);
  if (!resourceId || !description) {
    return [];
  }
  return [
    {
      category: getString(row, ["Category", "category"]),
      description,
      impact: getString(row, ["Impact", "impact"]),
      recommendationId: getString(row, [
        "Recommendation Id",
        "recommendationId",
      ]),
      resourceId,
      resourceName: getString(row, ["Resource Name", "resourceName", "name"]),
      resourceType: getString(row, ["Resource Type", "resourceType", "type"]),
    },
  ];
}

function normalizeImpactedResource(
  row: Record<string, unknown>,
): AzqrImpactedResource[] {
  const resourceId = getString(row, ["Resource Id", "resourceId", "id"]);
  const recommendation = getString(row, ["Recommendation", "recommendation"]);
  if (!resourceId || !recommendation) {
    return [];
  }
  return [
    {
      category: getString(row, ["Category", "category"]),
      impact: getString(row, ["Impact", "impact"]),
      learn: getString(row, ["Learn", "learn"]),
      recommendation,
      recommendationId: getString(row, [
        "Recommendation Id",
        "recommendationId",
      ]),
      resourceGroup: getString(row, ["Resource Group", "resourceGroup"]),
      resourceId,
      resourceName: getString(row, ["Resource Name", "resourceName", "name"]),
      resourceType: getString(row, ["Resource Type", "resourceType", "type"]),
      source: getString(row, ["Source", "source"]),
    },
  ];
}

function normalizeInventory(
  row: Record<string, unknown>,
): AzqrInventoryResource[] {
  const resourceId = getString(row, ["Resource Id", "resourceId", "id"]);
  if (!resourceId) {
    return [];
  }
  return [
    {
      kind: getString(row, ["Kind", "kind"]),
      location: getString(row, ["Location", "location"]),
      resourceId,
      resourceName: getString(row, ["Resource Name", "resourceName", "name"]),
      resourceType: getString(row, ["Resource Type", "resourceType", "type"]),
      skuName: getString(row, ["Sku Name", "skuName", "sku"]),
      skuTier: getString(row, ["Sku Tier", "skuTier", "tier"]),
      sla: getString(row, ["SLA", "sla"]),
    },
  ];
}

function opportunityFromAzqrAdvisor(
  row: AzqrAdvisorRecommendation,
  inventoryById: Map<string, AzqrInventoryResource>,
): FinOpsOpportunity | undefined {
  if (!isCostRecommendation(row.category, row.description)) {
    return undefined;
  }
  return createOpportunity({
    action: row.description,
    category: /reserved instance|savings plan/i.test(row.description)
      ? "commitment"
      : "cost-context",
    confidence: "medium",
    evidence: [
      "AZQR Advisor row is cost-related, but no saving amount is exposed in the workbook row.",
    ],
    inventory: inventoryById.get(row.resourceId.toLowerCase()),
    resource: {
      id: row.resourceId,
      name: row.resourceName,
      type: row.resourceType,
    },
    sourceFinding: {
      recommendationId: row.recommendationId,
      source: "azqr",
      title: `Advisor: ${row.description}`,
    },
  });
}

function opportunityFromAzqrImpacted(
  row: AzqrImpactedResource,
  inventoryById: Map<string, AzqrInventoryResource>,
): FinOpsOpportunity | undefined {
  if (!isCleanupRecommendation(row.recommendation)) {
    return undefined;
  }
  return createOpportunity({
    action: `Review for cleanup: ${row.recommendation}`,
    category: "cleanup",
    confidence: "low",
    evidence: [
      `${row.source || "AZQR"} ${row.category || "recommendation"} finding`,
      "Potential saving requires Cost Management or Retail Prices enrichment.",
    ],
    inventory: inventoryById.get(row.resourceId.toLowerCase()),
    resource: {
      id: row.resourceId,
      name: row.resourceName,
      resourceGroup: row.resourceGroup,
      type: row.resourceType,
    },
    sourceFinding: {
      recommendationId: row.recommendationId,
      source: "azqr",
      title: row.recommendation,
    },
  });
}

function opportunityFromFinding(
  finding: Finding,
  report: AzureDetailedResourceReport,
): FinOpsOpportunity | undefined {
  if (finding.source === "advisor") {
    return createOpportunity({
      action: finding.recommendedAction ?? finding.reason,
      category: /reserved instance|savings plan/i.test(finding.reason)
        ? "commitment"
        : "cost-context",
      confidence: finding.estimatedMonthlySavings ? "high" : "medium",
      estimatedMonthlySavings: finding.estimatedMonthlySavings,
      evidence: [finding.reason],
      resource: {
        id: finding.resourceId,
        name: report.resource.name,
        type: report.resource.type,
      },
      sourceFinding: {
        recommendationId: finding.code,
        source: "azure-advisor",
        title: finding.reason,
      },
    });
  }

  if (
    /very low cpu|premium tier with low resource utilization/i.test(
      finding.reason,
    )
  ) {
    return createOpportunity({
      action:
        "Evaluate downsizing or reservation for underutilized compute capacity.",
      category: "rightsizing",
      confidence: "medium",
      evidence: [finding.reason],
      resource: {
        id: finding.resourceId,
        name: report.resource.name,
        type: report.resource.type,
      },
      sourceFinding: {
        recommendationId: finding.code,
        source: "savemoney",
        title: finding.reason,
      },
    });
  }

  if (
    /very low transaction count|unattached|not associated/i.test(finding.reason)
  ) {
    return createOpportunity({
      action: `Review for cleanup: ${finding.reason}`,
      category: "cleanup",
      confidence: "low",
      evidence: [finding.reason],
      resource: {
        id: finding.resourceId,
        name: report.resource.name,
        type: report.resource.type,
      },
      sourceFinding: {
        recommendationId: finding.code,
        source: "savemoney",
        title: finding.reason,
      },
    });
  }

  return undefined;
}

function summarizeSavings(opportunities: FinOpsOpportunity[]): Money[] {
  const totals = new Map<string, number>();
  for (const opportunity of opportunities) {
    const savings = opportunity.estimatedMonthlySavings;
    if (!savings) {
      continue;
    }
    totals.set(
      savings.currency,
      (totals.get(savings.currency) ?? 0) + savings.amount,
    );
  }
  return [...totals.entries()].map(([currency, amount]) => ({
    amount,
    currency,
  }));
}
