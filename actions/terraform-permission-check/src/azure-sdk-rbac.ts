/**
 * @fileoverview Read-only Azure ARM RBAC collector for permission checks.
 *
 * Uses the CI identity established by csp-login to resolve the target CD UAMI
 * and retrieve its deployed role assignments and definitions.
 */

import {
  AuthorizationManagementClient,
  type RoleAssignment,
  type RoleDefinition,
} from "@azure/arm-authorization";
import { ManagedServiceIdentityClient } from "@azure/arm-msi";
import { AzureCliCredential, type TokenCredential } from "@azure/identity";

interface AzureRbacContextOptions {
  cdIdentityName?: string;
  cdIdentityResourceGroupName?: string;
  credential?: TokenCredential;
  environment: NodeJS.ProcessEnv;
  planText: string;
  reader?: AzureRbacReader;
  subscriptionId?: string;
}

export interface AzureRbacReader {
  getRoleDefinition(roleDefinitionId: string): Promise<RoleDefinition>;
  getUserAssignedIdentityPrincipalId(
    resourceGroupName: string,
    identityName: string,
  ): Promise<string | undefined>;
  listRoleAssignments(scope: string): AsyncIterable<RoleAssignment>;
}

interface CollectedAssignment {
  assignmentScope: string;
  roleDefinitionId: string;
}

export async function collectAzureRbacContext(
  options: AzureRbacContextOptions,
): Promise<string> {
  const subscriptionId =
    options.subscriptionId ?? options.environment["ARM_SUBSCRIPTION_ID"];
  if (!subscriptionId || !options.cdIdentityName) {
    return "Status: unavailable. Azure SDK live RBAC collection requires an Azure subscription ID and CD identity name.";
  }

  const resourceGroupName =
    options.cdIdentityResourceGroupName ??
    deriveIdentityResourceGroupName(options.cdIdentityName);
  if (!resourceGroupName) {
    return "Status: unavailable. Azure SDK could not derive the CD identity resource group. Provide cd-identity-resource-group-name.";
  }

  const reader =
    options.reader ??
    createAzureRbacReader(
      options.credential ?? new AzureCliCredential(),
      subscriptionId,
    );

  try {
    const principalId = await reader.getUserAssignedIdentityPrincipalId(
      resourceGroupName,
      options.cdIdentityName,
    );
    if (!principalId) {
      return `Status: unavailable. Azure SDK resolved CD identity ${options.cdIdentityName}, but it has no principal ID.`;
    }

    const scopes = extractAssignmentScopes(options.planText, subscriptionId);
    const assignments = await collectAssignments(reader, principalId, scopes);
    const roleDefinitions = await collectRoleDefinitions(reader, assignments);

    return [
      "Status: collected. Live Azure SDK read-only RBAC facts follow.",
      `CD identity: ${options.cdIdentityName}`,
      `CD principal ID: ${principalId}`,
      `CD identity resource group: ${resourceGroupName}`,
      `Scopes queried: ${scopes.join(", ")}`,
      "Role assignments:",
      JSON.stringify(assignments, null, 2),
      "Role definitions:",
      JSON.stringify(roleDefinitions, null, 2),
    ].join("\n");
  } catch (error) {
    return `Status: unavailable. Azure SDK live RBAC context could not be collected: ${formatAzureError(error)}`;
  }
}

export function deriveIdentityResourceGroupName(
  identityName: string,
): string | undefined {
  const match = /^(.*)-infra-github-cd-id-(\d+)$/u.exec(identityName);
  return match ? `${match[1]}-rg-${match[2]}` : undefined;
}

export function extractAssignmentScopes(
  planText: string,
  subscriptionId: string,
): string[] {
  const subscriptionScope = `/subscriptions/${subscriptionId}`;
  const resourceScopeRegex =
    /\/subscriptions\/[0-9a-f-]+(?:\/resourceGroups\/[^\s"']+)?(?:\/providers\/[^\s"']+)?/giu;
  const resourceScopes = planText.match(resourceScopeRegex) ?? [];
  const scopes = new Set<string>([subscriptionScope]);

  for (const scope of resourceScopes) {
    const normalizedScope = scope.replace(/[",)]$/gu, "");
    scopes.add(normalizedScope);
    const resourceGroupMatch =
      /^(\/subscriptions\/[0-9a-f-]+\/resourceGroups\/[^/]+)/iu.exec(
        normalizedScope,
      );
    if (resourceGroupMatch) {
      scopes.add(resourceGroupMatch[1]);
    }
  }

  return [...scopes];
}

function createAzureRbacReader(
  credential: TokenCredential,
  subscriptionId: string,
): AzureRbacReader {
  const authorizationClient = new AuthorizationManagementClient(
    credential,
    subscriptionId,
  );
  const identityClient = new ManagedServiceIdentityClient(
    credential,
    subscriptionId,
  );

  return {
    async getRoleDefinition(roleDefinitionId) {
      return authorizationClient.roleDefinitions.getById(roleDefinitionId);
    },
    async getUserAssignedIdentityPrincipalId(resourceGroupName, identityName) {
      const identity = await identityClient.userAssignedIdentities.get(
        resourceGroupName,
        identityName,
      );
      return identity.principalId;
    },
    listRoleAssignments(scope) {
      return authorizationClient.roleAssignments.listForScope(scope, {
        filter: "atScope()",
      });
    },
  };
}

async function collectAssignments(
  reader: AzureRbacReader,
  principalId: string,
  scopes: string[],
): Promise<CollectedAssignment[]> {
  const assignments: CollectedAssignment[] = [];

  for (const scope of scopes) {
    for await (const assignment of reader.listRoleAssignments(scope)) {
      if (
        assignment.principalId?.toLowerCase() === principalId.toLowerCase() &&
        assignment.roleDefinitionId
      ) {
        assignments.push({
          assignmentScope: assignment.scope ?? scope,
          roleDefinitionId: assignment.roleDefinitionId,
        });
      }
    }
  }

  return assignments;
}

async function collectRoleDefinitions(
  reader: AzureRbacReader,
  assignments: CollectedAssignment[],
): Promise<RoleDefinition[]> {
  const roleDefinitionIds = [
    ...new Set(assignments.map((assignment) => assignment.roleDefinitionId)),
  ];
  return Promise.all(
    roleDefinitionIds.map((roleDefinitionId) =>
      reader.getRoleDefinition(roleDefinitionId),
    ),
  );
}

function formatAzureError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number"
      ? `HTTP ${error.statusCode}: `
      : "";
  return `${statusCode}${error.message}`;
}
