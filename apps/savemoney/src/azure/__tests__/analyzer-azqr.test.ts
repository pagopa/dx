import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
}));
const costQueryMocks = vi.hoisted(() => ({
  getResourceCosts: vi.fn(),
}));
const { MockClient } = vi.hoisted(() => ({
  MockClient: class {
    readonly args: unknown[];

    constructor(...args: unknown[]) {
      this.args = args;
    }
  },
}));

vi.mock("@azure/arm-appcontainers", () => ({
  ContainerAppsAPIClient: MockClient,
}));
vi.mock("@azure/arm-appservice", () => ({
  WebSiteManagementClient: MockClient,
}));
vi.mock("@azure/arm-compute", () => ({
  ComputeManagementClient: MockClient,
}));
vi.mock("@azure/arm-monitor", () => ({
  MonitorClient: MockClient,
}));
vi.mock("@azure/arm-network", () => ({
  NetworkManagementClient: MockClient,
}));
vi.mock("@azure/arm-resources", () => ({
  ResourceManagementClient: MockClient,
}));
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: MockClient,
}));
vi.mock("@logtape/logtape", () => ({
  getLogger: vi.fn(() => loggerMocks),
}));
vi.mock("../analyzers/index.js", () => ({
  createDefaultAnalyzers: vi.fn(() => []),
  createDefaultSubscriptionAnalyzers: vi.fn(() => []),
}));
vi.mock("../cost-query.js", () => ({
  CostQueryClient: class {
    getResourceCosts = costQueryMocks.getResourceCosts;
  },
}));

import { analyzeAzureResources } from "../analyzer.js";

const azqrReportPath = fileURLToPath(
  new URL("./fixtures/subscription-scope.json", import.meta.url),
);

describe("AZQR subscription scope", () => {
  it("imports only selected resource IDs, even without live findings", async () => {
    costQueryMocks.getResourceCosts.mockClear();
    const reports = await analyzeAzureResources({
      azqrReportPath,
      preferredLocation: "italynorth",
      pricing: { enabled: false },
      sources: ["advisor"],
      subscriptionIds: [" A ", "b", "c"],
      timespanDays: 30,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].resource.id).toBe(
      "/subscriptions/A/resourceGroups/rg/providers/Microsoft.Compute/disks/disk-a",
    );
    expect(reports[0].findings).toHaveLength(2);
    expect(reports[0].findings?.[0].source).toBe("azqr");
    expect(loggerMocks.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "cannot be attributed to a subscription are ignored",
      ),
    );
    expect(loggerMocks.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "ignored 2 out-of-scope and 3 unattributable finding(s)",
      ),
    );
    expect(costQueryMocks.getResourceCosts).not.toHaveBeenCalled();
  });

  it("adds matching actual costs for the fixed 30-day window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T14:00:00Z"));
    const period = { end: "2026-11-16", start: "2026-10-18" };
    const cost = { amount: 12.5, basis: "ActualCost", currency: "EUR", period };
    costQueryMocks.getResourceCosts.mockResolvedValue(
      new Map([
        [
          "/subscriptions/a/resourcegroups/rg/providers/microsoft.compute/disks/disk-a",
          [cost],
        ],
        [
          "/subscriptions/unreported/resourcegroups/rg/providers/x/y/z",
          [{ ...cost, amount: 99 }],
        ],
      ]),
    );

    try {
      const reports = await analyzeAzureResources({
        azqrReportPath,
        includeActualCost: true,
        preferredLocation: "italynorth",
        pricing: { enabled: false },
        sources: ["advisor"],
        subscriptionIds: [" A ", "b", "c"],
        timespanDays: 7,
      });

      expect(costQueryMocks.getResourceCosts).toHaveBeenCalledExactlyOnceWith(
        "A",
        period,
      );
      expect(reports).toHaveLength(1);
      expect(reports[0].actualCosts).toEqual([cost]);
    } finally {
      vi.useRealTimers();
    }
  });
});
