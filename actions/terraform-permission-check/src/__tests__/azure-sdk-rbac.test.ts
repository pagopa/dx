import { describe, expect, it } from "vitest";

import {
  collectAzureRbacContext,
  deriveIdentityResourceGroupName,
  type AzureRbacReader,
} from "../azure-sdk-rbac.js";

describe("deriveIdentityResourceGroupName", () => {
  it("derives the resource group from the DX CD identity convention", () => {
    expect(
      deriveIdentityResourceGroupName("dx-d-itn-infra-github-cd-id-01"),
    ).toBe("dx-d-itn-rg-01");
  });
});

describe("collectAzureRbacContext", () => {
  it("collects target identity role assignments and definitions", async () => {
    const reader: AzureRbacReader = {
      async getRoleDefinition(roleDefinitionId) {
        return { id: roleDefinitionId, roleName: "Contributor" };
      },
      async getUserAssignedIdentityPrincipalId(
        resourceGroupName,
        identityName,
      ) {
        expect(resourceGroupName).toBe("dx-d-itn-rg-01");
        expect(identityName).toBe("dx-d-itn-infra-github-cd-id-01");
        return "target-principal-id";
      },
      async *listRoleAssignments(scope) {
        yield {
          principalId: "target-principal-id",
          roleDefinitionId:
            "/subscriptions/subscription-id/providers/Microsoft.Authorization/roleDefinitions/contributor-id",
          scope,
        };
        yield {
          principalId: "another-principal-id",
          roleDefinitionId:
            "/subscriptions/subscription-id/providers/Microsoft.Authorization/roleDefinitions/reader-id",
        };
      },
    };

    const context = await collectAzureRbacContext({
      cdIdentityName: "dx-d-itn-infra-github-cd-id-01",
      environment: {},
      planText:
        "resource_id = /subscriptions/subscription-id/resourceGroups/target-rg/providers/Microsoft.Storage/storageAccounts/example",
      reader,
      subscriptionId: "subscription-id",
    });

    expect(context).toContain("Status: collected");
    expect(context).toContain("target-principal-id");
    expect(context).toContain("Contributor");
    expect(context).not.toContain("reader-id");
  });

  it("preserves an assignment's actual scope instead of the queried scope", async () => {
    const reader: AzureRbacReader = {
      async getRoleDefinition(roleDefinitionId) {
        return { id: roleDefinitionId, roleName: "Contributor" };
      },
      async getUserAssignedIdentityPrincipalId() {
        return "target-principal-id";
      },
      async *listRoleAssignments() {
        yield {
          principalId: "target-principal-id",
          roleDefinitionId:
            "/subscriptions/subscription-id/providers/Microsoft.Authorization/roleDefinitions/contributor-id",
          scope:
            "/subscriptions/subscription-id/resourceGroups/existing-resource-group",
        };
      },
    };

    const context = await collectAzureRbacContext({
      cdIdentityName: "dx-d-itn-infra-github-cd-id-01",
      environment: {},
      planText: "",
      reader,
      subscriptionId: "subscription-id",
    });

    expect(context).toContain(
      '"assignmentScope": "/subscriptions/subscription-id/resourceGroups/existing-resource-group"',
    );
    expect(context).not.toContain(
      '"assignmentScope": "/subscriptions/subscription-id"',
    );
  });
});
