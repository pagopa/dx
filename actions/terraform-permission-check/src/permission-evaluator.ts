/** Evaluates normalized Azure RBAC facts without Azure SDK coupling. */

import type { PermissionRequirement } from "./terraform-plan.js";

export interface KeyVaultAccessPolicyFact {
  certificates: readonly string[];
  keys: readonly string[];
  secrets: readonly string[];
}

export interface KeyVaultAuthorizationFact {
  accessPolicy?: KeyVaultAccessPolicyFact;
  authorizationMode: "access-policy" | "rbac";
  scope: string;
}

export interface PermissionEvaluation {
  evidence: readonly string[];
  requirement: PermissionRequirement;
  result: "gap" | "inconclusive" | "pass";
}

export interface PermissionFacts {
  assignments: readonly RoleAssignmentFact[];
  keyVaults?: readonly KeyVaultAuthorizationFact[];
  roleDefinitions: readonly RoleDefinitionFact[];
}

export interface RoleAssignmentFact {
  condition?: string;
  roleDefinitionId: string;
  scope: string;
}

export interface RoleDefinitionFact {
  actions: readonly string[];
  dataActions: readonly string[];
  id: string;
  name: string;
  notActions: readonly string[];
  notDataActions: readonly string[];
}

const normalizeScope = (scope: string): string =>
  scope.replace(/\/+$/u, "").toLowerCase();

export const isScopeApplicable = (
  assignmentScope: string,
  targetScope: string,
): boolean => {
  const normalizedAssignmentScope = normalizeScope(assignmentScope);
  const normalizedTargetScope = normalizeScope(targetScope);

  return (
    normalizedTargetScope === normalizedAssignmentScope ||
    normalizedTargetScope.startsWith(`${normalizedAssignmentScope}/`)
  );
};

const actionPatternToRegExp = (pattern: string): RegExp => {
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*/gu, ".*");
  return new RegExp(`^${escapedPattern}$`, "iu");
};

const matchesAction = (pattern: string, action: string): boolean =>
  actionPatternToRegExp(pattern).test(action);

const roleGrantsAction = (
  roleDefinition: RoleDefinitionFact,
  action: string,
): boolean =>
  roleDefinition.actions.some((pattern) => matchesAction(pattern, action)) &&
  !roleDefinition.notActions.some((pattern) => matchesAction(pattern, action));

const roleGrantsDataAction = (
  roleDefinition: RoleDefinitionFact,
  action: string,
): boolean =>
  roleDefinition.dataActions.some((pattern) =>
    matchesAction(pattern, action),
  ) &&
  !roleDefinition.notDataActions.some((pattern) =>
    matchesAction(pattern, action),
  );

const roleGrantsRequirement = (
  roleDefinition: RoleDefinitionFact,
  requirement: PermissionRequirement,
): boolean =>
  requirement.plane === undefined || requirement.plane === "management"
    ? roleGrantsAction(roleDefinition, requirement.action)
    : roleGrantsDataAction(roleDefinition, requirement.action);

const keyVaultActionPattern =
  /^Microsoft\.KeyVault\/vaults\/(certificates|keys|secrets)\/([^/]+)\/action$/iu;

const keyVaultPolicyPermission = (
  action: string,
):
  | undefined
  | { permission: string; resource: "certificates" | "keys" | "secrets" } => {
  const actionMatch = keyVaultActionPattern.exec(action);
  if (!actionMatch) {
    return undefined;
  }

  const resource = actionMatch[1].toLowerCase() as
    | "certificates"
    | "keys"
    | "secrets";
  const operation = actionMatch[2].toLowerCase();
  const permission =
    operation.startsWith("get") || operation.startsWith("list")
      ? operation.startsWith("list")
        ? "list"
        : "get"
      : operation.startsWith("set")
        ? "set"
        : operation.startsWith("create")
          ? "create"
          : operation.startsWith("delete")
            ? "delete"
            : operation.startsWith("recover")
              ? "recover"
              : operation.startsWith("purge")
                ? "purge"
                : undefined;
  return permission ? { permission, resource } : undefined;
};

const keyVaultAccessPolicyGrantsRequirement = (
  requirement: PermissionRequirement,
  keyVault: KeyVaultAuthorizationFact,
): boolean => {
  const permission = keyVaultPolicyPermission(requirement.action);
  return (
    permission !== undefined &&
    (keyVault.accessPolicy?.[permission.resource] ?? []).some(
      (value) => value.toLowerCase() === permission.permission,
    )
  );
};

export const evaluateRequirement = (
  requirement: PermissionRequirement,
  facts: PermissionFacts,
): PermissionEvaluation => {
  const definitionsById = new Map(
    facts.roleDefinitions.map((definition) => [
      definition.id.toLowerCase(),
      definition,
    ]),
  );
  const applicableAssignments = facts.assignments.filter((assignment) =>
    isScopeApplicable(assignment.scope, requirement.scope),
  );

  const keyVault =
    requirement.plane === "key-vault-data"
      ? facts.keyVaults?.find(
          (fact) =>
            normalizeScope(fact.scope) === normalizeScope(requirement.scope),
        )
      : undefined;
  if (requirement.plane === "key-vault-data" && !keyVault) {
    return {
      evidence: [
        `Key Vault authorization facts are unavailable for ${requirement.scope}`,
      ],
      requirement,
      result: "inconclusive",
    };
  }

  if (keyVault?.authorizationMode === "access-policy") {
    return keyVaultAccessPolicyGrantsRequirement(requirement, keyVault)
      ? {
          evidence: [`Matching Key Vault access policy at ${keyVault.scope}`],
          requirement,
          result: "pass",
        }
      : {
          evidence: [
            `No matching Key Vault access policy at ${keyVault.scope}`,
          ],
          requirement,
          result: "gap",
        };
  }

  const unconditionalGrant = applicableAssignments.find((assignment) => {
    if (assignment.condition) {
      return false;
    }
    const definition = definitionsById.get(
      assignment.roleDefinitionId.toLowerCase(),
    );
    return definition && roleGrantsRequirement(definition, requirement);
  });

  if (unconditionalGrant) {
    const definition = definitionsById.get(
      unconditionalGrant.roleDefinitionId.toLowerCase(),
    );
    return {
      evidence: [
        `${definition?.name ?? unconditionalGrant.roleDefinitionId} at ${unconditionalGrant.scope}`,
      ],
      requirement,
      result: "pass",
    };
  }

  const unresolvedDefinition = applicableAssignments.find(
    (assignment) =>
      !definitionsById.has(assignment.roleDefinitionId.toLowerCase()),
  );
  if (unresolvedDefinition) {
    return {
      evidence: [
        `Role definition ${unresolvedDefinition.roleDefinitionId} is unavailable`,
      ],
      requirement,
      result: "inconclusive",
    };
  }

  const conditionalGrant = applicableAssignments.find((assignment) => {
    if (!assignment.condition) {
      return false;
    }
    const definition = definitionsById.get(
      assignment.roleDefinitionId.toLowerCase(),
    );
    return definition && roleGrantsRequirement(definition, requirement);
  });
  if (conditionalGrant) {
    return {
      evidence: [
        `Conditional assignment at ${conditionalGrant.scope} requires manual evaluation`,
      ],
      requirement,
      result: "inconclusive",
    };
  }

  return {
    evidence: applicableAssignments.map((assignment) => {
      const definition = definitionsById.get(
        assignment.roleDefinitionId.toLowerCase(),
      );
      return `${definition?.name ?? assignment.roleDefinitionId} at ${assignment.scope}`;
    }),
    requirement,
    result: "gap",
  };
};

export const evaluateRequirements = (
  requirements: readonly PermissionRequirement[],
  facts: PermissionFacts,
): readonly PermissionEvaluation[] =>
  requirements.map((requirement) => evaluateRequirement(requirement, facts));
