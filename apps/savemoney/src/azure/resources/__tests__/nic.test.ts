/**
 * Tests for analyzeNic() — a NIC is only unused when nothing attaches it.
 */

import type { NetworkManagementClient } from "@azure/arm-network";
import type { GenericResource } from "@azure/arm-resources";

import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import { analyzeNic } from "../nic.js";

vi.mock("../../utils.js", () => ({
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/networkInterfaces/nic1",
  name: "nic1",
  type: "Microsoft.Network/networkInterfaces",
};

function makeNetworkClient(details: object) {
  const client = mockDeep<NetworkManagementClient>();
  client.networkInterfaces.get.mockResolvedValue(details);
  return client;
}

describe("analyzeNic", () => {
  it("does not flag a NIC attached to a private endpoint without a public IP", async () => {
    const result = await analyzeNic(
      RESOURCE,
      makeNetworkClient({ privateEndpoint: { id: "/pe1" } }),
    );

    expect(result.suspectedUnused).toBe(false);
  });

  it("flags a NIC attached to neither a VM nor a private endpoint", async () => {
    const result = await analyzeNic(RESOURCE, makeNetworkClient({}));

    expect(result.suspectedUnused).toBe(true);
    expect(result.reason).toContain(
      "not attached to any VM or private endpoint",
    );
  });
});
