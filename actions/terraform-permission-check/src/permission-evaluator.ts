/** Evaluates normalized management-plane RBAC facts without Azure SDK coupling. */

import type { PermissionRequirement } from "./terraform-plan.js";

export interface PermissionEvaluation {
  evidence: readonly string[];
  requirement: PermissionRequirement;
  result: "gap" | "inconclusive" | "pass";
}

export interface PermissionFacts {
  assignments: readonly RoleAssignmentFact[];
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

  const unconditionalGrant = applicableAssignments.find((assignment) => {
    if (assignment.condition) {
      return false;
    }
    const definition = definitionsById.get(
      assignment.roleDefinitionId.toLowerCase(),
    );
    return definition && roleGrantsAction(definition, requirement.action);
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
    return definition && roleGrantsAction(definition, requirement.action);
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
