/**
 * Unit tests for stable per-sentence custom finding codes.
 *
 * These codes are what lets `foldDuplicateFinding` collapse two custom
 * findings that describe the same problem on the same resource, so the tests
 * focus on: known sentences get a stable identity, identical wording shared
 * across resource types collapses onto one code, and anything the table
 * doesn't recognise (or that already has an identity, or isn't "custom") is
 * left untouched.
 */

import { describe, expect, it } from "vitest";

import type { Finding } from "../../finding.js";

import { assignCustomFindingCodes } from "../finding-code.js";

const RESOURCE_ID =
  "/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/disks/disk1";

function customFinding(
  reason: string,
  overrides: Partial<Finding> = {},
): Finding {
  return {
    category: "cost",
    code: "custom.unknown",
    reason,
    resourceId: RESOURCE_ID,
    severity: "low",
    source: "custom",
    ...overrides,
  };
}

describe("assignCustomFindingCodes", () => {
  it.each([
    ["Disk is unattached.", "custom.disk.unattached"],
    [
      "NIC not attached to any VM or private endpoint.",
      "custom.nic.unattached",
    ],
    ["No public IP assigned.", "custom.nic.no-public-ip"],
    [
      "Private Endpoint has no private link service connections configured.",
      "custom.private-endpoint.no-connections",
    ],
    ["Container App is not running.", "custom.container-app.not-running"],
    ["App Service Plan has no apps deployed.", "custom.app-service.no-apps"],
    [
      "Public IP not associated with any resource.",
      "custom.public-ip.unassociated",
    ],
    ["Static IP not in use.", "custom.public-ip.static-unused"],
    [
      "Very low transaction count (2.00 avg/day).",
      "custom.storage.low-transactions",
    ],
    ["VM is deallocated.", "custom.vm.deallocated"],
    ["VM is stopped.", "custom.vm.stopped"],
    ["Low CPU usage (avg 1.23%).", "custom.vm.low-cpu-usage"],
    ["Low network traffic (0.50 MB/day avg).", "custom.vm.low-network-traffic"],
    [
      "No traffic data available in 30 days.",
      "custom.static-site.no-traffic-data",
    ],
    [
      "Very low site traffic (3 requests in 30 days).",
      "custom.static-site.low-traffic",
    ],
    [
      "Very low data transfer (0.01 MB in 30 days).",
      "custom.static-site.low-data-transfer",
    ],
    ["Resource ID is missing.", "custom.missing-resource-id"],
    ["Could not retrieve detailed NIC information.", "custom.lookup-failed"],
    ["No tags found.", "custom.missing-tags"],
  ])("assigns %j the stable code %j", (reason, expectedCode) => {
    const [finding] = assignCustomFindingCodes([customFinding(reason)]);
    expect(finding.code).toBe(expectedCode);
    expect(finding.recommendationId).toBe(expectedCode);
  });

  it.each([
    ["Very low CPU usage (12.34%).", "App Service Plan"],
    ["Very low CPU usage (0.5000 cores).", "Container App"],
  ])(
    "shares one code across resource types for identical wording: %j (%s)",
    (reason) => {
      const [finding] = assignCustomFindingCodes([customFinding(reason)]);
      expect(finding.recommendationId).toBe("custom.low-cpu-usage");
    },
  );

  it("gives two different resources' identical sentences the same recommendationId, enabling a later fold within a resource but not across resources", () => {
    const [a, b] = assignCustomFindingCodes([
      customFinding("Very low network traffic (1.00 MB/day avg)."),
      customFinding("Very low network traffic (2.00 MB/day avg)."),
    ]);

    expect(a.recommendationId).toBe("custom.low-network-traffic");
    expect(b.recommendationId).toBe("custom.low-network-traffic");
  });

  it("leaves unrecognised sentences unchanged", () => {
    const finding = customFinding("Something entirely unexpected happened.");

    expect(assignCustomFindingCodes([finding])).toEqual([finding]);
  });

  it("leaves non-custom findings unchanged", () => {
    const finding = customFinding("Disk is unattached.", {
      code: "advisor.some-id",
      recommendationId: "advisor.some-id",
      source: "advisor",
    });

    expect(assignCustomFindingCodes([finding])).toEqual([finding]);
  });

  it("does not overwrite a finding that already has a recommendationId", () => {
    const finding = customFinding("Disk is unattached.", {
      recommendationId: "custom.already-set",
    });

    expect(assignCustomFindingCodes([finding])).toEqual([finding]);
  });
});
