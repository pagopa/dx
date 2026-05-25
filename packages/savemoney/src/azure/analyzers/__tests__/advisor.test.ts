/**
 * Tests for the Azure Advisor subscription-level analyzer.
 *
 * We never touch a real Azure subscription: the analyzer is constructed
 * with an injected client factory that returns a fake exposing only the
 * `recommendations.list()` async iterator the analyzer relies on.
 */

import type { TokenCredential } from "@azure/identity";

import { describe, expect, it } from "vitest";

import type { SubscriptionContext } from "../subscription.js";

import { createAdvisorAnalyzer } from "../advisor.js";

// The analyzer only consumes the fields below; using a structural mock
// keeps the test independent from the (rather verbose) SDK shape.
type RecLike = {
  category?: string;
  extendedProperties?: Record<string, string>;
  id?: string;
  impact?: string;
  recommendationTypeId?: string;
  resourceMetadata?: { resourceId?: string };
  shortDescription?: { problem?: string; solution?: string };
};

function makeCtx(): SubscriptionContext {
  const credential: TokenCredential = {
    getToken: async () => null,
  };
  return {
    credential,
    subscriptionId: "00000000-0000-0000-0000-000000000000",
    verbose: false,
  };
}

// Reusable ARM-style resource IDs used across tests
const RID1 =
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-1";
const RID2 =
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm-2";

function makeFakeClient(recs: RecLike[]) {
  return {
    recommendations: {
      async *list() {
        for (const r of recs) yield r;
      },
    },
  };
}

describe("createAdvisorAnalyzer", () => {
  it("exposes a stable id", () => {
    const analyzer = createAdvisorAnalyzer({
      build: () => makeFakeClient([]),
    });
    expect(analyzer.id).toBe("azure.advisor");
  });

  it("returns no findings for an empty list", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () => makeFakeClient([]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings).toEqual([]);
  });
});

describe("createAdvisorAnalyzer — recommendation mapping", () => {
  it("maps a Cost recommendation to a Finding with savings", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            extendedProperties: {
              savingsAmount: "42.50",
              savingsCurrency: "EUR",
            },
            impact: "High",
            recommendationTypeId: "right-size-vm",
            resourceMetadata: {
              resourceId:
                "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm",
            },
            shortDescription: {
              problem: "Right-size your VM",
              solution: "Switch to a smaller SKU",
            },
          },
        ]),
    });

    const findings = await analyzer.analyze(makeCtx());

    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding.source).toBe("advisor");
    expect(finding.code).toBe("advisor.right-size-vm");
    expect(finding.severity).toBe("high");
    expect(finding.category).toBe("cost");
    expect(finding.estimatedMonthlySavings).toEqual({
      amount: 42.5,
      currency: "EUR",
    });
    expect(finding.recommendedAction).toBe("Switch to a smaller SKU");
    expect(finding.reason).toBe("Right-size your VM.");
    expect(finding.resourceId).toBe(
      "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm",
    );
  });

  it("maps `Medium` impact to severity `medium`", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "Medium",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].severity).toBe("medium");
  });

  it("falls back to `low` for unknown impact values", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "Bogus",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].severity).toBe("low");
  });
});

describe("createAdvisorAnalyzer — savings parsing", () => {
  it("omits estimatedMonthlySavings when savingsAmount is missing", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "Low",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].estimatedMonthlySavings).toBeUndefined();
  });

  it("omits estimatedMonthlySavings when savingsAmount is not a number", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            extendedProperties: { savingsAmount: "n/a" },
            impact: "Low",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].estimatedMonthlySavings).toBeUndefined();
  });

  it("defaults the currency to USD when only savingsAmount is present", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            extendedProperties: { savingsAmount: "10" },
            impact: "Low",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].estimatedMonthlySavings).toEqual({
      amount: 10,
      currency: "USD",
    });
  });
});

describe("createAdvisorAnalyzer — filtering", () => {
  it("skips non-Cost recommendations", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Security",
            impact: "High",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
            shortDescription: { problem: "p" },
          },
          {
            category: "Cost",
            impact: "Low",
            recommendationTypeId: "y",
            resourceMetadata: { resourceId: RID2 },
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("advisor.y");
  });

  it("attributes subscription as fallback resource when resourceId is absent", async () => {
    const ctx = makeCtx();
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "Low",
            recommendationTypeId: "x",
            resourceMetadata: {},
            shortDescription: { problem: "p" },
          },
        ]),
    });
    const findings = await analyzer.analyze(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].resourceId).toBe(`/subscriptions/${ctx.subscriptionId}`);
  });

  it("includes subscription-scoped recommendations using their own resource ID", async () => {
    const SUB_URI = "/subscriptions/00000000-0000-0000-0000-000000000000";
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "High",
            recommendationTypeId: "reserved-instance",
            resourceMetadata: { resourceId: SUB_URI },
            shortDescription: { problem: "Consider reserved instances" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings).toHaveLength(1);
    expect(findings[0].resourceId).toBe(SUB_URI);
    expect(findings[0].severity).toBe("high");
  });

  it("aggregates subscription-scoped findings with the same recommendationTypeId", async () => {
    const SUB_URI = "/subscriptions/00000000-0000-0000-0000-000000000000";
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            extendedProperties: {
              savingsAmount: "121",
              savingsCurrency: "EUR",
            },
            id: "/subscriptions/sub1/advisorRecommendations/r1",
            impact: "High",
            recommendationTypeId: "postgresql-ri",
            resourceMetadata: { resourceId: SUB_URI },
            shortDescription: {
              problem: "Consider PostgreSQL reserved instance",
            },
          },
          {
            category: "Cost",
            extendedProperties: { savingsAmount: "71", savingsCurrency: "EUR" },
            id: "/subscriptions/sub1/advisorRecommendations/r2",
            impact: "High",
            recommendationTypeId: "postgresql-ri",
            resourceMetadata: { resourceId: SUB_URI },
            shortDescription: {
              problem: "Consider PostgreSQL reserved instance",
            },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    // Two API entries with the same type → one aggregated finding.
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("advisor.postgresql-ri");
    expect(findings[0].estimatedMonthlySavings).toEqual({
      amount: 121,
      currency: "EUR",
    });
    expect(findings[0].reason).toContain("2 options");
  });

  it("deduplicates subscription-scoped entries with the same recommendation ARM ID", async () => {
    const SUB_URI = "/subscriptions/00000000-0000-0000-0000-000000000000";
    const dupId =
      "/subscriptions/sub1/providers/microsoft.advisor/recommendations/dup";
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            extendedProperties: { savingsAmount: "50", savingsCurrency: "EUR" },
            id: dupId,
            impact: "High",
            recommendationTypeId: "vm-ri",
            resourceMetadata: { resourceId: SUB_URI },
            shortDescription: { problem: "Buy VM reserved instance" },
          },
          {
            // Same ARM ID returned again by the API — should be counted only once.
            category: "Cost",
            extendedProperties: { savingsAmount: "50", savingsCurrency: "EUR" },
            id: dupId,
            impact: "High",
            recommendationTypeId: "vm-ri",
            resourceMetadata: { resourceId: SUB_URI },
            shortDescription: { problem: "Buy VM reserved instance" },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings).toHaveLength(1);
    // Savings must NOT be doubled.
    expect(findings[0].estimatedMonthlySavings?.amount).toBe(50);
  });

  it("uses a fallback reason when shortDescription is missing", async () => {
    const analyzer = createAdvisorAnalyzer({
      build: () =>
        makeFakeClient([
          {
            category: "Cost",
            impact: "Low",
            recommendationTypeId: "x",
            resourceMetadata: { resourceId: RID1 },
          },
        ]),
    });
    const findings = await analyzer.analyze(makeCtx());
    expect(findings[0].reason).toBe("Azure Advisor cost recommendation.");
  });
});
