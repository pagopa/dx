/**
 * Unit tests for the AZQR-to-FinOps PoC projection.
 */

import { describe, expect, it } from "vitest";

import type { AzureDetailedResourceReport } from "../types.js";

import { generateFinOpsReport, parseAzqrReport } from "../azqr-finops.js";

describe("AZQR FinOps PoC", () => {
  it("combines AZQR cleanup findings with Advisor savings", () => {
    const azqrReport = parseAzqrReport({
      ImpactedResources: [
        {
          Category: "Governance",
          Impact: "Medium",
          Recommendation: "Public IPs not attached to any resource",
          "Recommendation Id": "pip-unused",
          "Resource Group": "rg-test",
          "Resource Id":
            "/subscriptions/sub/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-01",
          "Resource Name": "pip-01",
          "Resource Type": "Microsoft.Network/publicIPAddresses",
          Source: "AOR",
        },
      ],
      Inventory: [
        {
          Location: "italynorth",
          "Resource Id":
            "/subscriptions/sub/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-01",
          "Resource Name": "pip-01",
          "Resource Type": "Microsoft.Network/publicIPAddresses",
          "Sku Name": "Standard",
          "Sku Tier": "Regional",
        },
      ],
    });
    const savemoneyReports: AzureDetailedResourceReport[] = [
      {
        analysis: {
          costRisk: "high",
          reason: "Consider purchasing a savings plan.",
          suspectedUnused: true,
        },
        findings: [
          {
            category: "cost",
            code: "advisor.savings-plan",
            estimatedMonthlySavings: { amount: 42, currency: "EUR" },
            reason: "Consider purchasing a savings plan.",
            resourceId: "/subscriptions/sub",
            severity: "high",
            source: "advisor",
          },
        ],
        resource: {
          id: "/subscriptions/sub",
          name: "sub",
          type: "Microsoft.Subscription",
        },
      },
    ];

    const report = generateFinOpsReport({ azqrReport, savemoneyReports });

    expect(report.summary).toEqual({
      estimatedMonthlySavings: [{ amount: 42, currency: "EUR" }],
      opportunities: 2,
      withEstimatedSavings: 1,
    });
    expect(report.sources).toEqual({
      azqr: {
        advisorRows: 0,
        impactedRows: 1,
        inventoryRows: 1,
        opportunityFindings: 1,
      },
      azureAdvisor: {
        opportunityFindings: 1,
      },
      savemoney: {
        findings: 1,
        opportunityFindings: 0,
        resourceReports: 1,
      },
    });
    expect(report.opportunities[0]?.category).toBe("commitment");
    expect(report.opportunities[1]?.resource.skuName).toBe("Standard");
  });

  it("parses the real azqr scan --json keys", () => {
    const azqrReport = parseAzqrReport({
      advisor: [
        {
          category: "Cost",
          description: "Consider right-sizing this resource",
          impact: "Medium",
          recommendationId: "advisor-001",
          resourceId:
            "/subscriptions/sub/resourceGroups/rg-test/providers/Microsoft.Compute/virtualMachines/vm-01",
          resourceName: "vm-01",
          resourceType: "microsoft.compute/virtualmachines",
        },
      ],
      impacted: [
        {
          category: "Governance",
          impact: "Medium",
          recommendation: "Public IPs not attached to any resource",
          recommendationId: "pip-unused",
          resourceGroup: "rg-test",
          resourceId:
            "/subscriptions/sub/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-01",
          resourceName: "pip-01",
          resourceType: "Microsoft.Network/publicIPAddresses",
          source: "AZQR",
        },
      ],
      inventory: [
        {
          location: "italynorth",
          resourceId:
            "/subscriptions/sub/resourceGroups/rg-test/providers/Microsoft.Network/publicIPAddresses/pip-01",
          resourceName: "pip-01",
          resourceType: "Microsoft.Network/publicIPAddresses",
          skuName: "Standard",
          skuTier: "Regional",
        },
      ],
    });

    expect(azqrReport.advisor).toHaveLength(1);
    expect(azqrReport.impactedResources).toHaveLength(1);
    expect(azqrReport.inventory).toHaveLength(1);
    expect(azqrReport.impactedResources[0]?.source).toBe("AZQR");
  });
});
