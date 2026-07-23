/** Verifies normalized read-only Azure RBAC collection. */

import { describe, expect, it } from "vitest";

import {
  type AzureRbacReader,
  collectAzureRbacFacts,
  deriveRbacQueryScopes,
} from "../azure-rbac.js";

const targetScope =
  "/subscriptions/sub/resourceGroups/target/providers/Microsoft.KeyVault/vaults/example";

describe("deriveRbacQueryScopes", () => {
  it("derives and deduplicates subscription, resource group, and target scopes", () => {
    expect(deriveRbacQueryScopes([targetScope, `${targetScope}/`])).toEqual([
      "/subscriptions/sub",
      "/subscriptions/sub/resourceGroups/target",
      targetScope,
    ]);
  });

  it("supports cross-subscription targets", () => {
    expect(
      deriveRbacQueryScopes(["/subscriptions/other/resourceGroups/shared"]),
    ).toEqual([
      "/subscriptions/other",
      "/subscriptions/other/resourceGroups/shared",
    ]);
  });
});

describe("collectAzureRbacFacts", () => {
  it("filters the principal and preserves the actual assignment scope", async () => {
    const queriedScopes: string[] = [];
    const reader: AzureRbacReader = {
      async getRoleDefinition(roleDefinitionId) {
        return {
          id: roleDefinitionId,
          permissions: [
            {
              actions: ["Microsoft.Authorization/*"],
              notActions: ["Microsoft.Authorization/locks/delete"],
            },
          ],
          roleName: "DX Deployer",
        };
      },
      async getUserAssignedIdentity(resourceGroupName, identityName) {
        expect(resourceGroupName).toBe("identity-rg");
        expect(identityName).toBe("infra-cd");
        return { principalId: "target-principal" };
      },
      async *listRoleAssignments(scope) {
        queriedScopes.push(scope);
        if (scope === "/subscriptions/sub") {
          yield {
            principalId: "target-principal",
            roleDefinitionId: "/roleDefinitions/deployer",
            scope: "/subscriptions/sub/resourceGroups/existing",
          };
          yield {
            principalId: "another-principal",
            roleDefinitionId: "/roleDefinitions/reader",
            scope,
          };
        }
      },
    };

    const result = await collectAzureRbacFacts({
      cdIdentityName: "infra-cd",
      cdIdentityResourceGroupName: "identity-rg",
      reader,
      subscriptionId: "sub",
      targetScopes: [targetScope],
    });

    expect(result.status).toBe("collected");
    if (result.status !== "collected") {
      return;
    }
    expect(queriedScopes).toEqual([
      "/subscriptions/sub",
      "/subscriptions/sub/resourceGroups/target",
      targetScope,
    ]);
    expect(result.facts.assignments).toEqual([
      {
        roleDefinitionId: "/roleDefinitions/deployer",
        scope: "/subscriptions/sub/resourceGroups/existing",
      },
    ]);
    expect(result.facts.roleDefinitions).toEqual([
      {
        actions: ["Microsoft.Authorization/*"],
        dataActions: [],
        id: "/roleDefinitions/deployer",
        name: "DX Deployer",
        notActions: ["Microsoft.Authorization/locks/delete"],
        notDataActions: [],
      },
    ]);
  });

  it("returns unavailable when any Azure read fails", async () => {
    const reader: AzureRbacReader = {
      async getRoleDefinition() {
        return {};
      },
      async getUserAssignedIdentity() {
        const error = new Error("Forbidden");
        Object.assign(error, { statusCode: 403 });
        throw error;
      },
      async *listRoleAssignments() {
        yield {};
      },
    };

    const result = await collectAzureRbacFacts({
      cdIdentityName: "infra-cd",
      cdIdentityResourceGroupName: "identity-rg",
      reader,
      subscriptionId: "sub",
      targetScopes: [targetScope],
    });

    expect(result).toEqual({
      reason: "Azure RBAC facts could not be collected: HTTP 403: Forbidden",
      status: "unavailable",
    });
  });

  it("discards assignments collected before a later scope read fails", async () => {
    const reader: AzureRbacReader = {
      async getRoleDefinition() {
        throw new Error("Role definitions must not be read from partial facts");
      },
      async getUserAssignedIdentity() {
        return { principalId: "target-principal" };
      },
      async *listRoleAssignments(scope) {
        if (scope === "/subscriptions/sub") {
          yield {
            principalId: "target-principal",
            roleDefinitionId: "/roleDefinitions/deployer",
            scope,
          };
          return;
        }

        const error = new Error("Forbidden on child scope");
        Object.assign(error, { statusCode: 403 });
        throw error;
      },
    };

    const result = await collectAzureRbacFacts({
      cdIdentityName: "infra-cd",
      cdIdentityResourceGroupName: "identity-rg",
      reader,
      subscriptionId: "sub",
      targetScopes: [targetScope],
    });

    expect(result).toEqual({
      reason:
        "Azure RBAC facts could not be collected: HTTP 403: Forbidden on child scope",
      status: "unavailable",
    });
  });
});
