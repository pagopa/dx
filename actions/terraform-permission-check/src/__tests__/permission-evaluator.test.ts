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
