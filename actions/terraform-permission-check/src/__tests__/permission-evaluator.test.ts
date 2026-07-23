/** Verifies effective management-plane RBAC evaluation. */

import { describe, expect, it } from "vitest";

import type { PermissionRequirement } from "../terraform-plan.js";

import {
  evaluateRequirement,
  isScopeApplicable,
  type PermissionFacts,
} from "../permission-evaluator.js";

const requirement: PermissionRequirement = {
  action: "Microsoft.Authorization/roleAssignments/write",
  operation: "create",
  resourceAddress: "azurerm_role_assignment.example",
  scope:
    "/subscriptions/sub/resourceGroups/target/providers/Microsoft.KeyVault/vaults/example",
};

const createFacts = (
  actions: readonly string[],
  notActions: readonly string[] = [],
): PermissionFacts => ({
  assignments: [
    {
      roleDefinitionId: "/roleDefinitions/deployer",
      scope: "/subscriptions/sub/resourceGroups/target",
    },
  ],
  roleDefinitions: [
    {
      actions,
      dataActions: [],
      id: "/roleDefinitions/deployer",
      name: "DX Deployer",
      notActions,
      notDataActions: [],
    },
  ],
});

const dataRequirement: PermissionRequirement = {
  action: "Microsoft.Storage/storageAccounts/blobServices/containers/read",
  operation: "create",
  plane: "storage-data",
  resourceAddress: "azurerm_storage_container.example",
  scope:
    "/subscriptions/sub/resourceGroups/target/providers/Microsoft.Storage/storageAccounts/example/blobServices/default/containers/example",
};

const keyVaultRequirement: PermissionRequirement = {
  action: "Microsoft.KeyVault/vaults/secrets/setSecret/action",
  operation: "create",
  plane: "key-vault-data",
  resourceAddress: "azurerm_key_vault_secret.example",
  scope:
    "/subscriptions/sub/resourceGroups/target/providers/Microsoft.KeyVault/vaults/example",
};

describe("isScopeApplicable", () => {
  it("applies parent scopes case-insensitively", () => {
    expect(
      isScopeApplicable(
        "/subscriptions/SUB/resourceGroups/TARGET/",
        requirement.scope,
      ),
    ).toBe(true);
  });

  it("does not confuse sibling scope prefixes", () => {
    expect(
      isScopeApplicable(
        "/subscriptions/sub/resourceGroups/tar",
        requirement.scope,
      ),
    ).toBe(false);
  });
});

describe("evaluateRequirement", () => {
  it("passes when an inherited role grants the exact action", () => {
    const evaluation = evaluateRequirement(
      requirement,
      createFacts(["Microsoft.Authorization/roleAssignments/write"]),
    );

    expect(evaluation.result).toBe("pass");
    expect(evaluation.evidence).toContain(
      "DX Deployer at /subscriptions/sub/resourceGroups/target",
    );
  });

  it("passes when an inherited role grants the action through a wildcard", () => {
    const evaluation = evaluateRequirement(
      requirement,
      createFacts(["Microsoft.Authorization/*"]),
    );

    expect(evaluation.result).toBe("pass");
  });

  it("reports a gap when NotActions excludes the required action", () => {
    const evaluation = evaluateRequirement(
      requirement,
      createFacts(
        ["Microsoft.Authorization/*"],
        ["Microsoft.Authorization/roleAssignments/write"],
      ),
    );

    expect(evaluation.result).toBe("gap");
  });

  it("passes data-plane requirements with matching DataActions", () => {
    const facts = createFacts([]);
    const evaluation = evaluateRequirement(dataRequirement, {
      ...facts,
      roleDefinitions: [
        {
          ...facts.roleDefinitions[0],
          dataActions: [
            "Microsoft.Storage/storageAccounts/blobServices/containers/read",
          ],
        },
      ],
    });

    expect(evaluation.result).toBe("pass");
  });

  it("does not use management Actions to pass data-plane requirements", () => {
    const evaluation = evaluateRequirement(
      dataRequirement,
      createFacts(["Microsoft.Storage/*"]),
    );

    expect(evaluation.result).toBe("gap");
  });

  it("reports a gap when NotDataActions excludes the required action", () => {
    const facts = createFacts([]);
    const evaluation = evaluateRequirement(dataRequirement, {
      ...facts,
      roleDefinitions: [
        {
          ...facts.roleDefinitions[0],
          dataActions: ["Microsoft.Storage/*"],
          notDataActions: [
            "Microsoft.Storage/storageAccounts/blobServices/containers/read",
          ],
        },
      ],
    });

    expect(evaluation.result).toBe("gap");
  });

  it("passes Key Vault data requirements through matching access policies", () => {
    const evaluation = evaluateRequirement(keyVaultRequirement, {
      ...createFacts([]),
      keyVaults: [
        {
          accessPolicy: {
            certificates: [],
            keys: [],
            secrets: ["set"],
          },
          authorizationMode: "access-policy",
          scope: keyVaultRequirement.scope,
        },
      ],
    });

    expect(evaluation.result).toBe("pass");
  });

  it("does not use Key Vault access policies for RBAC-enabled vaults", () => {
    const evaluation = evaluateRequirement(keyVaultRequirement, {
      ...createFacts([]),
      keyVaults: [
        {
          accessPolicy: {
            certificates: [],
            keys: [],
            secrets: ["set"],
          },
          authorizationMode: "rbac",
          scope: keyVaultRequirement.scope,
        },
      ],
    });

    expect(evaluation.result).toBe("gap");
  });

  it("is inconclusive when Key Vault authorization facts are unavailable", () => {
    const evaluation = evaluateRequirement(
      keyVaultRequirement,
      createFacts([]),
    );

    expect(evaluation.result).toBe("inconclusive");
  });

  it("reports a gap when assignments do not apply at the target scope", () => {
    const facts = createFacts(["*"]);
    const evaluation = evaluateRequirement(requirement, {
      ...facts,
      assignments: [
        {
          roleDefinitionId: "/roleDefinitions/deployer",
          scope: "/subscriptions/sub/resourceGroups/other",
        },
      ],
    });

    expect(evaluation.result).toBe("gap");
  });

  it("is inconclusive when only a conditional assignment grants access", () => {
    const facts = createFacts(["Microsoft.Authorization/*"]);
    const evaluation = evaluateRequirement(requirement, {
      ...facts,
      assignments: facts.assignments.map((assignment) => ({
        ...assignment,
        condition: "unsupported condition",
      })),
    });

    expect(evaluation.result).toBe("inconclusive");
  });

  it("is inconclusive when an applicable role definition is unavailable", () => {
    const facts = createFacts(["*"]);
    const evaluation = evaluateRequirement(requirement, {
      assignments: facts.assignments,
      roleDefinitions: [],
    });

    expect(evaluation.result).toBe("inconclusive");
  });
});
