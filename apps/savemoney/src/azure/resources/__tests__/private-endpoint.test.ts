/**
 * Tests for analyzePrivateEndpoint() — manual approval-based connections count
 * as valid private link connections.
 */

import type { NetworkManagementClient } from "@azure/arm-network";
import type { GenericResource } from "@azure/arm-resources";

import { describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import { analyzePrivateEndpoint } from "../private-endpoint.js";

vi.mock("../../utils.js", () => ({
  verboseLog: vi.fn(),
  verboseLogAnalysisResult: vi.fn(),
  verboseLogResourceStart: vi.fn(),
}));

const RESOURCE: GenericResource = {
  id: "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/privateEndpoints/pe1",
  name: "pe1",
  type: "Microsoft.Network/privateEndpoints",
};

function makeNetworkClient(details: object) {
  const client = mockDeep<NetworkManagementClient>();
  client.privateEndpoints.get.mockResolvedValue(details);
  return client;
}

const SUBNET = { id: "/subnets/s1" };
const NICS = [{ id: "/nics/n1" }];

describe("analyzePrivateEndpoint — manual connections", () => {
  it("does not flag an endpoint whose manual connection is Approved", async () => {
    const result = await analyzePrivateEndpoint(
      RESOURCE,
      makeNetworkClient({
        manualPrivateLinkServiceConnections: [
          { privateLinkServiceConnectionState: { status: "Approved" } },
        ],
        networkInterfaces: NICS,
        subnet: SUBNET,
      }),
    );

    expect(result.suspectedUnused).toBe(false);
  });

  it("flags an endpoint whose manual connection is Disconnected", async () => {
    const result = await analyzePrivateEndpoint(
      RESOURCE,
      makeNetworkClient({
        manualPrivateLinkServiceConnections: [
          { privateLinkServiceConnectionState: { status: "Disconnected" } },
        ],
        networkInterfaces: NICS,
        subnet: SUBNET,
      }),
    );

    expect(result.suspectedUnused).toBe(true);
    expect(result.reason).toContain("rejected or disconnected");
  });
});
