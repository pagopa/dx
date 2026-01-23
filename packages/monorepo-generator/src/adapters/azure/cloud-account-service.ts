import type { TokenCredential } from "@azure/identity";

import { AuthorizationManagementClient } from "@azure/arm-authorization";
import { ManagedServiceIdentityClient } from "@azure/arm-msi";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { ResourceManagementClient } from "@azure/arm-resources";
import { StorageManagementClient } from "@azure/arm-storage";
import { BlobServiceClient } from "@azure/storage-blob";
import { getLogger } from "@logtape/logtape";
import { Client } from "@microsoft/microsoft-graph-client";
import * as assert from "node:assert/strict";
import { z } from "zod/v4";

import {
  CloudAccount,
  type CloudAccountService,
} from "../../domain/cloud-account.js";
import {
  type EnvironmentId,
  environmentShort,
} from "../../domain/environment.js";
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

export const azureJsonWebTokenSchema = z.object({
  oid: z.string(), // Object ID
});

export class AzureCloudAccountService implements CloudAccountService {
  #credential: TokenCredential;
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
    // All principal IDs to check (user + all groups)
    const allPrincipalIds = await this.#getCurrentPrincipalIds();

    // Get role assignments for the subscription
    const authClient = new AuthorizationManagementClient(
      this.#credential,
      cloudAccountId,
    );

    const requiredRoles = [
      "8e3af657-a8ff-443c-a75c-2fe8c4bcb635", // Owner
      "ba92f5b4-2d11-453d-a403-e96b0029c9fe", // Storage Blob Data Contributor
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
    }

    // Check if all required roles are present
    const hasAllRoles = requiredRoles.every((requiredRole) =>
      assignedRoleDefinitionIds.has(requiredRole),
    );

    return hasAllRoles;
  }

  async initialize(
    cloudAccount: CloudAccount,
    { name, prefix }: EnvironmentId,
    tags: Record<string, string> = {},
  ): Promise<void> {
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

    const resourceGroupName = `${prefix}-${short.env}-${short.location}-bootstrap-rg-01`;

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

    const msiClient = new ManagedServiceIdentityClient(
      this.#credential,
      cloudAccount.id,
    );

    const identityName = `${prefix}-${short.env}-${short.location}-bootstrap-id-01`;

    await msiClient.userAssignedIdentities.createOrUpdate(
      resourceGroupName,
      identityName,
      parameters,
    );

    logger.debug(
      "Created identity {identityName} in subscription {subscriptionId}",
      { identityName, subscriptionId: cloudAccount.id },
    );
  }

  async isInitialized(
    cloudAccountId: CloudAccount["id"],
    { name, prefix }: EnvironmentId,
  ): Promise<boolean> {
    const allLocations = Object.values(locationShort).join("|");
    const shortEnv = environmentShort[name];
    const resourceName = `${prefix}-${shortEnv}-(${allLocations})-bootstrap-id-(0[1-9]|[1-9]\\d)`;
    const query = `resources
             | where type == 'microsoft.managedidentity/userassignedidentities'
             | where name matches regex @'${resourceName}'
            `;
    const result = await this.#resourceGraphClient.resources({
      query,
      subscriptions: [cloudAccountId],
    });

    const initialized = result.totalRecords > 0;

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

  async #getCurrentPrincipalIds(): Promise<Set<string>> {
    // Get access token for Microsoft Graph
    const tokenResponse = await this.#credential.getToken(
      "https://graph.microsoft.com/.default",
    );

    if (!tokenResponse) {
      throw new Error("Failed to acquire token for Microsoft Graph");
    }

    // Create Graph client with custom auth provider
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, tokenResponse.token);
      },
    });

    // Get current user's info
    const me = await graphClient.api("/me").get();
    const userObjectId: string = me.id;

    // Get all group memberships (transitive - includes nested groups)
    const groupIds: string[] = [];
    let nextLink = "/me/transitiveMemberOf?$select=id";

    while (nextLink) {
      const response = await graphClient.api(nextLink).get();
      for (const item of response.value) {
        if (item.id) {
          groupIds.push(item.id);
        }
      }
      nextLink = response["@odata.nextLink"];
    }

    // All principal IDs to check (user + all groups)
    const allPrincipalIds = new Set([userObjectId, ...groupIds]);
    return allPrincipalIds;
  }
}
