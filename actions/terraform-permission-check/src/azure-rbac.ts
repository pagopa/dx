/** Collects the CD identity's effective RBAC facts through read-only Azure SDK calls. */

import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { ManagedServiceIdentityClient } from "@azure/arm-msi";
import { AzureCliCredential, type TokenCredential } from "@azure/identity";
import { z } from "zod";

import type {
  PermissionFacts,
  RoleAssignmentFact,
  RoleDefinitionFact,
} from "./permission-evaluator.js";

const identitySchema = z.object({
  principalId: z.string().min(1),
});

const roleAssignmentSchema = z.object({
  condition: z.string().nullish(),
  principalId: z.string().min(1),
  roleDefinitionId: z.string().min(1),
  scope: z.string().min(1).optional(),
});

const permissionSchema = z.object({
  actions: z.array(z.string()).nullish(),
  dataActions: z.array(z.string()).nullish(),
  notActions: z.array(z.string()).nullish(),
  notDataActions: z.array(z.string()).nullish(),
});

const roleDefinitionSchema = z.object({
  id: z.string().min(1).optional(),
  permissions: z.array(permissionSchema).nullish(),
  roleName: z.string().min(1).optional(),
});

export type AzureRbacCollection =
  | {
      facts: PermissionFacts;
      principalId: string;
      queriedScopes: readonly string[];
      status: "collected";
    }
  | {
      reason: string;
      status: "unavailable";
    };

export interface AzureRbacReader {
  getRoleDefinition(roleDefinitionId: string): Promise<unknown>;
  getUserAssignedIdentity(
    resourceGroupName: string,
    identityName: string,
  ): Promise<unknown>;
  listRoleAssignments(scope: string): AsyncIterable<unknown>;
}

export interface CollectAzureRbacOptions {
  cdIdentityName: string;
  cdIdentityResourceGroupName: string;
  credential?: TokenCredential;
  reader?: AzureRbacReader;
  subscriptionId: string;
  targetScopes: readonly string[];
}

const subscriptionScopePattern = /^\/subscriptions\/[^/]+/iu;
const resourceGroupScopePattern =
  /^(\/subscriptions\/[^/]+\/resourceGroups\/[^/]+)/iu;

export const deriveRbacQueryScopes = (
  targetScopes: readonly string[],
): readonly string[] => {
  const scopes = new Map<string, string>();
  const addScope = (scope: string): void => {
    const normalizedScope = scope.replace(/\/+$/u, "");
    scopes.set(normalizedScope.toLowerCase(), normalizedScope);
  };

  for (const targetScope of targetScopes) {
    const subscriptionMatch = subscriptionScopePattern.exec(targetScope);
    if (!subscriptionMatch) {
      continue;
    }
    addScope(subscriptionMatch[0]);

    const resourceGroupMatch = resourceGroupScopePattern.exec(targetScope);
    if (resourceGroupMatch) {
      addScope(resourceGroupMatch[1]);
    }
    addScope(targetScope);
  }

  return [...scopes.values()];
};

const createAzureRbacReader = (
  credential: TokenCredential,
  subscriptionId: string,
): AzureRbacReader => {
  const authorizationClient = new AuthorizationManagementClient(
    credential,
    subscriptionId,
  );
  const identityClient = new ManagedServiceIdentityClient(
    credential,
    subscriptionId,
  );

  return {
    getRoleDefinition(roleDefinitionId) {
      return authorizationClient.roleDefinitions.getById(roleDefinitionId);
    },
    getUserAssignedIdentity(resourceGroupName, identityName) {
      return identityClient.userAssignedIdentities.get(
        resourceGroupName,
        identityName,
      );
    },
    listRoleAssignments(scope) {
      return authorizationClient.roleAssignments.listForScope(scope, {
        filter: "atScope()",
      });
    },
  };
};

const parseExternalValue = <Output>(
  schema: z.ZodType<Output>,
  value: unknown,
  label: string,
): Output => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
};

const collectAssignments = async (
  reader: AzureRbacReader,
  principalId: string,
  queryScopes: readonly string[],
): Promise<readonly RoleAssignmentFact[]> => {
  const assignments = new Map<string, RoleAssignmentFact>();

  for (const queryScope of queryScopes) {
    for await (const rawAssignment of reader.listRoleAssignments(queryScope)) {
      const assignment = parseExternalValue(
        roleAssignmentSchema,
        rawAssignment,
        `Invalid role assignment returned for ${queryScope}`,
      );
      if (assignment.principalId.toLowerCase() !== principalId.toLowerCase()) {
        continue;
      }

      const fact = {
        ...(assignment.condition ? { condition: assignment.condition } : {}),
        roleDefinitionId: assignment.roleDefinitionId,
        scope: assignment.scope ?? queryScope,
      };
      const key = [
        fact.scope.toLowerCase(),
        fact.roleDefinitionId.toLowerCase(),
        fact.condition ?? "",
      ].join("|");
      assignments.set(key, fact);
    }
  }

  return [...assignments.values()];
};

const collectRoleDefinitions = async (
  reader: AzureRbacReader,
  assignments: readonly RoleAssignmentFact[],
): Promise<readonly RoleDefinitionFact[]> => {
  const roleDefinitionIds = [
    ...new Map(
      assignments.map((assignment) => [
        assignment.roleDefinitionId.toLowerCase(),
        assignment.roleDefinitionId,
      ]),
    ).values(),
  ];

  return Promise.all(
    roleDefinitionIds.map(async (roleDefinitionId) => {
      const definition = parseExternalValue(
        roleDefinitionSchema,
        await reader.getRoleDefinition(roleDefinitionId),
        `Invalid role definition ${roleDefinitionId}`,
      );
      const permissions = definition.permissions ?? [];

      return {
        actions: permissions.flatMap((permission) => permission.actions ?? []),
        dataActions: permissions.flatMap(
          (permission) => permission.dataActions ?? [],
        ),
        id: definition.id ?? roleDefinitionId,
        name: definition.roleName ?? roleDefinitionId,
        notActions: permissions.flatMap(
          (permission) => permission.notActions ?? [],
        ),
        notDataActions: permissions.flatMap(
          (permission) => permission.notDataActions ?? [],
        ),
      };
    }),
  );
};

const formatAzureError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? `HTTP ${error.statusCode}: `
      : "";
  return `${statusCode}${error.message}`;
};

export const collectAzureRbacFacts = async (
  options: CollectAzureRbacOptions,
): Promise<AzureRbacCollection> => {
  const queryScopes = deriveRbacQueryScopes(options.targetScopes);
  if (queryScopes.length === 0) {
    return {
      reason: "No supported Azure subscription scopes were found in the plan",
      status: "unavailable",
    };
  }

  const reader =
    options.reader ??
    createAzureRbacReader(
      options.credential ?? new AzureCliCredential(),
      options.subscriptionId,
    );

  try {
    const identity = parseExternalValue(
      identitySchema,
      await reader.getUserAssignedIdentity(
        options.cdIdentityResourceGroupName,
        options.cdIdentityName,
      ),
      `Invalid CD identity ${options.cdIdentityName}`,
    );
    const assignments = await collectAssignments(
      reader,
      identity.principalId,
      queryScopes,
    );
    const roleDefinitions = await collectRoleDefinitions(reader, assignments);

    return {
      facts: { assignments, roleDefinitions },
      principalId: identity.principalId,
      queriedScopes: queryScopes,
      status: "collected",
    };
  } catch (error) {
    return {
      reason: `Azure RBAC facts could not be collected: ${formatAzureError(error)}`,
      status: "unavailable",
    };
  }
};
