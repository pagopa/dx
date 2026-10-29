import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
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

import { analyzeAzureResources } from "../analyzer.js";

const azqrReportPath = fileURLToPath(
  new URL("./fixtures/subscription-scope.json", import.meta.url),
);

describe("AZQR subscription scope", () => {
  it("imports only selected resource IDs, even without live findings", async () => {
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
  });
});
