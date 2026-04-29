import type { TokenCredential } from "@azure/identity";

import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import { ManagedServiceIdentityClient } from "@azure/arm-msi";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { StorageManagementClient } from "@azure/arm-storage";
import { SecretClient } from "@azure/keyvault-secrets";
import { BlobServiceClient } from "@azure/storage-blob";
import { getLogger } from "@logtape/logtape";
import { Client } from "@microsoft/microsoft-graph-client";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { z } from "zod/v4";

import {
  CloudAccount,
  type CloudAccountService,
} from "../../domain/cloud-account.js";
import {
  type EnvironmentId,
  environmentShort,
} from "../../domain/environment.js";
import { type GitHubRepo } from "../../domain/github-repo.js";
import {
  GitHubAppCredentials,
  type GitHubService,
} from "../../domain/github.js";
import {
  type TerraformBackend,
  terraformBackendSchema,
} from "../../domain/remote-backend.js";
import { isAzureLocation, locations, locationShort } from "./locations.js";

// We are only interested in these properties for now;
// the actual result structure contains the full cloud resource object
export const resourceGraphDataSchema = z.object({
  location: z.enum(locations),
  name: z.string(),
  resourceGroup: z.string(),
});

const graphUserResponseSchema = z.object({
  id: z.string(),
});

const graphGroupMembershipItemSchema = z.object({
  id: z.string(),
});

const graphGroupMembershipResponseSchema = z.object({
  "@odata.nextLink": z.string().optional(),
  value: z.array(graphGroupMembershipItemSchema),
});

const builtInRoleDefinitionIds = {
  contributor: "b24988ac-6180-42a0-ab88-20f7382dd24c",
  keyVaultSecretsOfficer: "b86a8fe4-44ce-4948-aee5-eccb2c155cd7",
  owner: "8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
  roleBasedAccessControlAdministrator: "f58310d9-a9f6-439a-9e8d-f62e7b41a168",
  storageBlobDataContributor: "ba92f5b4-2d11-453d-a403-e96b0029c9fe",
} as const;

const bootstrapIdentityRoleDefinitionIds = [
  // These roles let the bootstrap identity run the bootstrapper module from GitHub Actions without extra manual grants.
  builtInRoleDefinitionIds.roleBasedAccessControlAdministrator,
  builtInRoleDefinitionIds.contributor,
  builtInRoleDefinitionIds.storageBlobDataContributor,
] as const;

export class AzureCloudAccountService implements CloudAccountService {
  #credential: TokenCredential;
  #requiredResourceProviders = [
    "Microsoft.Advisor",
    "Microsoft.AlertsManagement",
    "Microsoft.ApiManagement",
    "Microsoft.App",
    "Microsoft.Authorization",
    "Microsoft.AzureTerraform",
    "Microsoft.Cache",
    "Microsoft.Cdn",
    "Microsoft.ContainerInstance",
    "Microsoft.CostManagement",
    "Microsoft.DBforPostgreSQL",
    "Microsoft.KeyVault",
    "Microsoft.ServiceBus",
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.Web",
  ] as const;
  #resourceGraphClient: ResourceGraphClient;

  constructor(credential: TokenCredential) {
    this.#resourceGraphClient = new ResourceGraphClient(credential);
    this.#credential = credential;
  }

  async getTerraformBackend(
    cloudAccountId: CloudAccount["id"],
    { name, prefix }: EnvironmentId,
  ): Promise<TerraformBackend | undefined> {
    const allLocations = Object.values(locationShort).join("|");
    const shortEnv = environmentShort[name];
    // Check if a storage account with the expected name exists
    // $prefix + environment short + location + "tfstatest" + suffix (e.g., "dxpitntfstatest01")
    // it can return multiple results (e.g. for different location or instance number)
    const resourceName = `${prefix}${shortEnv}(${allLocations})tfstatest(0[1-9]|[1-9]\\d)`;
    const query = `resources
             | where type == 'microsoft.storage/storageaccounts'
             | where name matches regex @'${resourceName}'
            `;
    const result = await this.#resourceGraphClient.resources({
      query,
      subscriptions: [cloudAccountId],
    });
    if (result.totalRecords === 0) {
      return undefined;
    }
    const storageAccounts = z.array(resourceGraphDataSchema).parse(result.data);
    // on multiple results, rank storage accounts by location priority and instance number
    if (storageAccounts.length > 0) {
      storageAccounts.sort((a, b) => {
        // compare locations priority
        const locationComparison =
          locations.indexOf(a.location) - locations.indexOf(b.location);
        if (locationComparison === 0) {
          // same location, compare by name (to get the highest instance number)
          return b.name.localeCompare(a.name);
        }
        return locationComparison;
      });
    }
    return terraformBackendSchema.parse({
      resourceGroupName: storageAccounts[0].resourceGroup,
      storageAccountName: storageAccounts[0].name,
      subscriptionId: cloudAccountId,
      type: "azurerm",
    });
  }

  async hasUserPermissionToInitialize(
    cloudAccountId: CloudAccount["id"],
  ): Promise<boolean> {
    try {
      // All principal IDs to check (user + all groups)
      const allPrincipalIds = await this.#getCurrentPrincipalIds();

      // Get role assignments for the subscription
      const authClient = new AuthorizationManagementClient(
        this.#credential,
        cloudAccountId,
      );

      const requiredRoles = [
        builtInRoleDefinitionIds.owner, // Owner
        builtInRoleDefinitionIds.storageBlobDataContributor, // Storage Blob Data Contributor
        builtInRoleDefinitionIds.keyVaultSecretsOfficer, // Key Vault Secrets Officer
      ];

      const scope = `/subscriptions/${cloudAccountId}`;

      // Collect all role definition IDs assigned to the user or their groups
      const assignedRoleDefinitionIds = new Set<string>();

      for await (const assignment of authClient.roleAssignments.listForScope(
        scope,
      )) {
        // Check if this assignment is for the user or any of their groups
        if (
          assignment.principalId &&
          allPrincipalIds.has(assignment.principalId)
        ) {
          // Extract role definition ID from the full resource ID
          // Format: /subscriptions/{sub}/providers/Microsoft.Authorization/roleDefinitions/{roleId}
          const roleDefId = assignment.roleDefinitionId?.split("/").pop();
          if (roleDefId) {
            assignedRoleDefinitionIds.add(roleDefId);
          }
        }

        // Short-circuit: stop if all required roles have been found
        if (
          requiredRoles.every((requiredRole) =>
            assignedRoleDefinitionIds.has(requiredRole),
          )
        ) {
          return true;
        }
      }

      // Check if all required roles are present
      const hasAllRoles = requiredRoles.every((requiredRole) =>
        assignedRoleDefinitionIds.has(requiredRole),
      );

      return hasAllRoles;
    } catch (error: unknown) {
      // Handle authorization errors (403 Forbidden) - user lacks permissions
      if (
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 403
      ) {
        return false;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async initialize(
    cloudAccount: CloudAccount,
    { name, prefix }: EnvironmentId,
    runnerAppCredentials: GitHubAppCredentials,
    github: GitHubRepo,
    gitHubService: GitHubService,
    tags: Record<string, string> = {},
  ): Promise<void> {
    assert.equal(cloudAccount.csp, "azure", "Cloud account must be Azure");
    assert.ok(
      isAzureLocation(cloudAccount.defaultLocation),
      "The default location of the cloud account is not a valid Azure location",
    );

    const logger = getLogger(["gen", "env"]);

    // Register required resource providers before creating any resources
    await this.#registerProviders(cloudAccount.id);

    const resourceManagementClient = new ResourceManagementClient(
      this.#credential,
      cloudAccount.id,
    );

    const short = {
      env: environmentShort[name],
      location: locationShort[cloudAccount.defaultLocation],
    };

    const resourceGroupName = `${prefix}-${short.env}-${short.location}-common-rg-01`;

    const parameters = {
      location: cloudAccount.defaultLocation,
      tags: {
        Environment: name,
        ...tags,
      },
    };

    await resourceManagementClient.resourceGroups.createOrUpdate(
      resourceGroupName,
      parameters,
    );

    logger.debug(
      "Created resource group {resourceGroupName} in subscription {subscriptionId}",
      { resourceGroupName, subscriptionId: cloudAccount.id },
    );

    try {
      const identityName = `${prefix}-${short.env}-${short.location}-bootstrap-id-01`;

      const msiClient = new ManagedServiceIdentityClient(
        this.#credential,
        cloudAccount.id,
      );

      const identity = await msiClient.userAssignedIdentities.createOrUpdate(
        resourceGroupName,
        identityName,
        parameters,
      );

      assert.ok(
        identity.principalId,
        "Managed identity principal ID is undefined",
      );
      const identityPrincipalId = identity.principalId;
      assert.ok(identity.clientId, "Managed identity client ID is undefined");
      const identityClientId = identity.clientId;

      logger.debug(
        "Created identity {identityName} in subscription {subscriptionId}",
        { identityName, subscriptionId: cloudAccount.id },
      );

      const authorizationManagementClient = new AuthorizationManagementClient(
        this.#credential,
        cloudAccount.id,
      );
      const subscriptionScope = `/subscriptions/${cloudAccount.id}`;

      // Grant the bootstrap identity the Azure permissions it needs to operate autonomously in the bootstrap workflow.
      await Promise.all(
        bootstrapIdentityRoleDefinitionIds.map((roleDefinitionId) =>
          authorizationManagementClient.roleAssignments.create(
            subscriptionScope,
            this.#createRoleAssignmentName(
              subscriptionScope,
              identityPrincipalId,
              roleDefinitionId,
            ),
            {
              principalId: identityPrincipalId,
              principalType: "ServicePrincipal",
              roleDefinitionId: this.#createRoleDefinitionResourceId(
                cloudAccount.id,
                roleDefinitionId,
              ),
            },
          ),
        ),
      );

      logger.debug(
        "Assigned bootstrap roles to identity {identityName} in subscription {subscriptionId}",
        { identityName, subscriptionId: cloudAccount.id },
      );

      const githubEnvironmentName = `bootstrapper-${name}-cd`;

      // Federate the bootstrap identity with the GitHub environment so workflows can exchange their OIDC token for Azure access.
      await msiClient.federatedIdentityCredentials.createOrUpdate(
        resourceGroupName,
        identityName,
        githubEnvironmentName,
        {
          audiences: ["api://AzureADTokenExchange"],
          issuer: "https://token.actions.githubusercontent.com",
          subject: `repo:${github.owner}/${github.repo}:environment:${githubEnvironmentName}`,
        },
      );

      logger.debug(
        "Configured federated identity credential {credentialName} for identity {identityName} in subscription {subscriptionId}",
        {
          credentialName: githubEnvironmentName,
          identityName,
          subscriptionId: cloudAccount.id,
        },
      );

      // These secrets let the GitHub workflow target the bootstrap identity and subscription without extra setup.
      await Promise.all([
        gitHubService.createOrUpdateEnvironmentSecret({
          environmentName: githubEnvironmentName,
          owner: github.owner,
          repo: github.repo,
          secretName: "ARM_CLIENT_ID",
          secretValue: identityClientId,
        }),
        gitHubService.createOrUpdateEnvironmentSecret({
          environmentName: githubEnvironmentName,
          owner: github.owner,
          repo: github.repo,
          secretName: "ARM_SUBSCRIPTION_ID",
          secretValue: cloudAccount.id,
        }),
      ]);

      logger.debug("Set GitHub environment secrets for {environmentName}", {
        environmentName: githubEnvironmentName,
      });

      const keyVaultName = await this.#createCommonKeyVault({
        cloudAccount,
        name,
        prefix,
        resourceGroupName,
        shortEnv: short.env,
        shortLocation: short.location,
        tags,
      });

      await this.#storeRunnerAppSecrets({
        cloudAccountId: cloudAccount.id,
        keyVaultName,
        runnerAppCredentials,
      });
    } catch (cause) {
      // Cleanup resource group if initialization fails
      await resourceManagementClient.resourceGroups.beginDeleteAndWait(
        resourceGroupName,
      );
      logger.debug(
        "Deleted resource group {resourceGroupName} in subscription {subscriptionId} due to initialization failure",
        { resourceGroupName, subscriptionId: cloudAccount.id },
      );
      if (cause instanceof Error) {
        logger.error(cause.message);
      }
      throw new Error(`Error during the initialization of the cloud account`, {
        cause,
      });
    }
  }

  async isInitialized(
    cloudAccountId: CloudAccount["id"],
    { name, prefix }: EnvironmentId,
  ): Promise<boolean> {
    const allLocations = Object.values(locationShort).join("|");
    const shortEnv = environmentShort[name];

    const identityResourceName = `${prefix}-${shortEnv}-(${allLocations})-bootstrap-id-(0[1-9]|[1-9]\\d)`;
    const identityQuery = `resources
             | where type == 'microsoft.managedidentity/userassignedidentities'
             | where name matches regex @'${identityResourceName}'
            `;

    const keyVaultResourceName = `${prefix}-${shortEnv}-(${allLocations})-common-kv-(0[1-9]|[1-9]\\d)`;
    const keyVaultQuery = `resources
             | where type == 'microsoft.keyvault/vaults'
             | where name matches regex @'${keyVaultResourceName}'
            `;

    const [identityResult, keyVaultResult, areProvidersRegistered] =
      await Promise.all([
        this.#resourceGraphClient.resources({
          query: identityQuery,
          subscriptions: [cloudAccountId],
        }),
        this.#resourceGraphClient.resources({
          query: keyVaultQuery,
          subscriptions: [cloudAccountId],
        }),
        this.#areProvidersRegistered(cloudAccountId),
      ]);

    const initialized =
      identityResult.totalRecords > 0 &&
      keyVaultResult.totalRecords > 0 &&
      areProvidersRegistered;

    const logger = getLogger(["gen", "env"]);

    logger.debug("subscription {subscriptionId} initialized: {initialized}", {
      initialized,
      subscriptionId: cloudAccountId,
    });

    return initialized;
  }

  async provisionTerraformBackend(
    cloudAccount: CloudAccount,
    { name, prefix }: EnvironmentId,
    tags: Record<string, string> = {},
  ): Promise<TerraformBackend> {
    assert.equal(cloudAccount.csp, "azure", "Cloud account must be Azure");
    assert.ok(
      isAzureLocation(cloudAccount.defaultLocation),
      "The default location of the cloud account is not a valid Azure location",
    );

    const logger = getLogger(["gen", "env"]);

    const resourceManagementClient = new ResourceManagementClient(
      this.#credential,
      cloudAccount.id,
    );

    const short = {
      env: environmentShort[name],
      location: locationShort[cloudAccount.defaultLocation],
    };

    const parameters = {
      location: cloudAccount.defaultLocation,
      tags: {
        Environment: name,
        ...tags,
      },
    };

    const resourceGroupName = `${prefix}-${short.env}-${short.location}-tfstate-rg-01`;

    await resourceManagementClient.resourceGroups.createOrUpdate(
      resourceGroupName,
      parameters,
    );

    logger.debug(
      "Created resource group {resourceGroupName} in subscription {subscriptionId}",
      { resourceGroupName, subscriptionId: cloudAccount.id },
    );

    const storageManagementClient = new StorageManagementClient(
      this.#credential,
      cloudAccount.id,
    );

    const storageAccount =
      await storageManagementClient.storageAccounts.beginCreateAndWait(
        resourceGroupName,
        `${prefix}${short.env}${short.location}tfstatest01`,
        {
          kind: "StorageV2",
          sku: {
            name: "Standard_LRS",
            tier: "Standard",
          },
          ...parameters,
        },
      );

    assert.ok(
      storageAccount.primaryEndpoints?.blob,
      "Storage account blob endpoint is undefined",
    );

    assert.ok(storageAccount.name, "Storage account name is undefined");

    logger.debug(
      "Created storage account {storageAccountName} in subscription {subscriptionId}",
      {
        storageAccountName: storageAccount.name,
        subscriptionId: cloudAccount.id,
      },
    );
    const blobServiceClient = new BlobServiceClient(
      storageAccount.primaryEndpoints?.blob,
      this.#credential,
    );

    const containerClient =
      blobServiceClient.getContainerClient("terraform-state");

    try {
      await containerClient.create();
    } catch (e) {
      // Cleanup resource group if blob container creation fails
      // resource group deletion also deletes all contained resources
      await resourceManagementClient.resourceGroups.beginDeleteAndWait(
        resourceGroupName,
      );
      throw new Error(`Error during the creation of the blob container`, {
        cause: e,
      });
    }

    return terraformBackendSchema.parse({
      resourceGroupName,
      storageAccountName: storageAccount.name,
      subscriptionId: cloudAccount.id,
      type: "azurerm",
    });
  }

  async #areProvidersRegistered(subscriptionId: string): Promise<boolean> {
    const client = new ResourceManagementClient(
      this.#credential,
      subscriptionId,
    );
    const results = await Promise.all(
      this.#requiredResourceProviders.map(async (namespace) => {
        const provider = await client.providers.get(namespace);
        return provider.registrationState === "Registered";
      }),
    );
    return results.every(Boolean);
  }

  async #createCommonKeyVault({
    cloudAccount,
    name,
    prefix,
    resourceGroupName,
    shortEnv,
    shortLocation,
    tags,
  }: {
    cloudAccount: CloudAccount;
    name: EnvironmentId["name"];
    prefix: string;
    resourceGroupName: string;
    shortEnv: string;
    shortLocation: string;
    tags: Record<string, string>;
  }): Promise<string> {
    const logger = getLogger(["gen", "env"]);
    const subscriptionClient = new SubscriptionClient(this.#credential);
    const subscription = await subscriptionClient.subscriptions.get(
      cloudAccount.id,
    );
    assert.ok(subscription.tenantId, "Subscription tenant ID is undefined");

    const kvClient = new KeyVaultManagementClient(
      this.#credential,
      cloudAccount.id,
    );

    const keyVaultName = `${prefix}-${shortEnv}-${shortLocation}-common-kv-01`;
    const secretsProtectionEnabled = shortEnv === "p";

    const result = await kvClient.vaults.checkNameAvailability({
      name: keyVaultName,
      type: "Microsoft.KeyVault/vaults",
    });

    await kvClient.vaults.beginCreateOrUpdateAndWait(
      resourceGroupName,
      keyVaultName,
      {
        location: cloudAccount.defaultLocation,
        properties: {
          createMode: result.nameAvailable ? "default" : "recover",
          enabledForDiskEncryption: true,
          enablePurgeProtection: secretsProtectionEnabled ? true : undefined,
          enableRbacAuthorization: true,
          sku: {
            family: "A",
            name: "standard",
          },
          softDeleteRetentionInDays: secretsProtectionEnabled ? 14 : 7,
          tenantId: subscription.tenantId,
        },
        tags: {
          Environment: name,
          ...tags,
        },
      },
    );

    logger.debug(
      "Created key vault {keyVaultName} in subscription {subscriptionId}",
      { keyVaultName, subscriptionId: cloudAccount.id },
    );

    return keyVaultName;
  }

  #createRoleAssignmentName(
    scope: string,
    principalId: string,
    roleDefinitionId: string,
  ): string {
    const hash = createHash("sha256")
      .update(`${scope}:${principalId}:${roleDefinitionId}`)
      .digest("hex");

    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(
      12,
      16,
    )}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  #createRoleDefinitionResourceId(
    subscriptionId: string,
    roleDefinitionId: string,
  ): string {
    return `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${roleDefinitionId}`;
  }

  async #getCurrentPrincipalIds(): Promise<Set<string>> {
    // Create Graph client with custom auth provider that fetches fresh tokens
    const graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const tokenResponse = await this.#credential.getToken(
            "https://graph.microsoft.com/.default",
          );
          if (!tokenResponse) {
            done(
              new Error("Failed to acquire token for Microsoft Graph"),
              null,
            );
            return;
          }
          done(null, tokenResponse.token);
        } catch (error) {
          done(error as Error, null);
        }
      },
    });

    // Get current user's info
    const meResponse = await graphClient.api("/me").get();
    const me = graphUserResponseSchema.parse(meResponse);
    const userObjectId = me.id;

    // Get all group memberships (transitive - includes nested groups)
    const groupIds: string[] = [];
    let nextLink: string | undefined = "/me/transitiveMemberOf?$select=id";

    while (nextLink) {
      const rawResponse = await graphClient.api(nextLink).get();
      const response = graphGroupMembershipResponseSchema.parse(rawResponse);
      for (const item of response.value) {
        groupIds.push(item.id);
      }
      nextLink = response["@odata.nextLink"];
    }

    // All principal IDs to check (user + all groups)
    const allPrincipalIds = new Set([userObjectId, ...groupIds]);
    return allPrincipalIds;
  }

  async #registerProviders(subscriptionId: string): Promise<void> {
    const logger = getLogger(["dx-cli", "register-providers"]);
    const client = new ResourceManagementClient(
      this.#credential,
      subscriptionId,
    );

    logger.info(
      "Registering {count} resource providers on subscription {subscriptionId}",
      { count: this.#requiredResourceProviders.length, subscriptionId },
    );

    await Promise.all(
      this.#requiredResourceProviders.map(async (namespace) => {
        await client.providers.register(namespace);
        logger.debug("Registered provider {namespace}", { namespace });
      }),
    );

    logger.info(
      "All resource providers registered on subscription {subscriptionId}",
      { subscriptionId },
    );
  }

  async #storeRunnerAppSecrets({
    cloudAccountId,
    keyVaultName,
    runnerAppCredentials,
  }: {
    cloudAccountId: string;
    keyVaultName: string;
    runnerAppCredentials: GitHubAppCredentials;
  }): Promise<void> {
    const logger = getLogger(["gen", "env"]);

    const secretClient = new SecretClient(
      `https://${keyVaultName}.vault.azure.net/`,
      this.#credential,
    );

    await Promise.all([
      secretClient.setSecret("github-runner-app-id", runnerAppCredentials.id),
      secretClient.setSecret(
        "github-runner-app-installation-id",
        runnerAppCredentials.installationId,
      ),
      secretClient.setSecret(
        "github-runner-app-key",
        runnerAppCredentials.key.trimEnd(), // strip trailing newlines from PEM keys
      ),
    ]);

    logger.debug(
      "Created secrets in key vault {keyVaultName} in subscription {subscriptionId}",
      { keyVaultName, subscriptionId: cloudAccountId },
    );
  }
}
