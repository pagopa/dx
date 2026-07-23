/** Verifies deterministic report ownership and result summaries. */

import { describe, expect, it } from "vitest";

import type { PermissionRequirement } from "../terraform-plan.js";

import { classifyOwnership, renderReport } from "../report.js";

const createRequirement = (scope: string): PermissionRequirement => ({
  action: "Microsoft.Authorization/roleAssignments/write",
  operation: "create",
  resourceAddress: "azurerm_role_assignment.example",
  scope,
});

describe("classifyOwnership", () => {
  it("assigns cross-subscription remediation to the target subscription", () => {
    expect(
      classifyOwnership(
        createRequirement("/subscriptions/other/resourceGroups/shared"),
        "current",
      ).layer,
    ).toBe("target subscription");
  });

  it("assigns subscription and resource-group scopes to bootstrapper", () => {
    expect(
      classifyOwnership(
        createRequirement("/subscriptions/current/resourceGroups/product"),
        "current",
      ).layer,
    ).toBe("bootstrapper");
  });

  it("assigns resource-local scopes to resources", () => {
    expect(
      classifyOwnership(
        createRequirement(
          "/subscriptions/current/resourceGroups/product/providers/Microsoft.KeyVault/vaults/example",
        ),
        "current",
      ).layer,
    ).toBe("resources");
  });

  it("assigns Terraform state storage to core", () => {
    expect(
      classifyOwnership(
        createRequirement(
          "/subscriptions/current/resourceGroups/state/providers/Microsoft.Storage/storageAccounts/dxtfstate",
        ),
        "current",
      ).layer,
    ).toBe("core");
  });
});

describe("renderReport", () => {
  it("renders gaps and unsupported changes without blocking language", () => {
    const requirement = createRequirement(
      "/subscriptions/current/resourceGroups/product",
    );
    const report = renderReport({
      evaluations: [
        {
          evidence: [],
          requirement,
          result: "gap",
        },
      ],
      inconclusiveChanges: [
        {
          reason: "Terraform resource type is not covered by this PoC",
          resourceAddress: "azurerm_resource_group.example",
          resourceType: "azurerm_resource_group",
        },
      ],
      subscriptionId: "current",
      workingDirectory: "infra/resources/dev",
    });

    expect(report).toMatchObject({
      gapCount: 1,
      inconclusiveCount: 1,
      passCount: 0,
    });
    expect(report.markdown).toContain("**GAP**");
    expect(report.markdown).toContain("bootstrapper");
    expect(report.markdown).toContain("### Coverage limits");
  });

  it("does not recommend permission changes for passing requirements", () => {
    const report = renderReport({
      evaluations: [
        {
          evidence: ["Applicable role assignment grants the required action"],
          requirement: createRequirement(
            "/subscriptions/current/resourceGroups/product",
          ),
          result: "pass",
        },
      ],
      inconclusiveChanges: [],
      subscriptionId: "current",
      workingDirectory: "infra/resources/dev",
    });

    expect(report.markdown).toContain("No change required.");
    expect(report.markdown).toContain("read-only advisory check");
  });

  it("keeps untrusted working-directory text on one escaped heading", () => {
    const report = renderReport({
      evaluations: [],
      inconclusiveChanges: [],
      subscriptionId: "current",
      workingDirectory: "infra/(dev)\n## injected",
    });

    expect(report.markdown).toContain(
      "## Terraform Permission Check (infra/\\(dev\\) ## injected)",
    );
    expect(report.markdown).not.toContain("\n## injected");
  });
});
