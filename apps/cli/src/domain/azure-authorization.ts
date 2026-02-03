/**
 * Azure Authorization Domain
 *
 * Provides functions to enable and configure Azure subscriptions by managing
 * authorization settings in the eng-azure-authorization repository. This module
 * handles adding bootstrap identities to subscription-level configurations,
 * allowing automated setup of required access permissions.
 */

import { Result } from "neverthrow";
import { z } from "zod/v4";

/**
 * Branded type for subscription name.
 * Validates that the name contains only letters, numbers, and hyphens to prevent path traversal attacks.
 */
const SubscriptionName = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9-]+$/, {
    message: "Subscription name may contain only letters, numbers, and hyphens",
  })
  .brand<"SubscriptionName">();

/**
 * Branded type for bootstrap identity ID.
 * Validates that the ID contains only lowercase letters, numbers, and hyphens to prevent HCL injection attacks.
 */
const BootstrapIdentityId = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, {
    message:
      "Bootstrap identity ID may contain only lowercase letters, numbers, and hyphens",
  })
  .brand<"BootstrapIdentityId">();

/**
 * Branded type for resource prefix (e.g., "dx", "io").
 * Validates that the prefix contains only lowercase letters to prevent injection.
 */
const ResourcePrefix = z
  .string()
  .min(1)
  .regex(/^[a-z]+$/, {
    message: "Resource prefix may contain only lowercase letters",
  })
  .brand<"ResourcePrefix">();

/**
 * Branded type for environment short name (e.g., "d", "u", "p").
 * Validates single lowercase letter for environment.
 */
const EnvShort = z
  .string()
  .min(1)
  .max(1)
  .regex(/^[a-z]$/, {
    message: "Environment short name must be a single lowercase letter",
  })
  .brand<"EnvShort">();

/**
 * Input validation schema for the request Azure authorization use case.
 */
export const requestAzureAuthorizationInputSchema = z.object({
  bootstrapIdentityId: BootstrapIdentityId,
  envShort: EnvShort,
  prefix: ResourcePrefix,
  subscriptionName: SubscriptionName,
});

/**
 * Configuration for an AD group with its roles.
 */
export type GroupConfig = {
  readonly members: readonly string[];
  readonly name: string;
  readonly roles: readonly string[];
};

/**
 * Group name and roles configuration for default AD groups.
 */
type DefaultGroupSpec = {
  readonly roles: readonly string[];
  readonly groupName: string;
};

/**
 * Default AD groups that should be created for each subscription.
 * These follow the PagoPA standard pattern: <prefix>-<envShort>-adgroup-<groupName>
 */
export const DEFAULT_GROUP_SPECS: readonly DefaultGroupSpec[] = [
  { roles: ["Owner"], groupName: "admin" },
  { roles: ["Owner"], groupName: "developers" },
  {
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
    groupName: "operations",
  },
  {
    roles: ["Reader", "Support Request Contributor"],
    groupName: "security",
  },
  {
    roles: ["Reader", "Monitoring Contributor", "Support Request Contributor"],
    groupName: "technical-project-managers",
  },
  {
    roles: ["Reader", "Support Request Contributor"],
    groupName: "product-owners",
  },
  { roles: ["Owner"], groupName: "externals" },
  {
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
    groupName: "oncall",
  },
];

/**
 * Generates the full group name from prefix, envShort, and groupName.
 */
export const makeGroupName = (
  prefix: string,
  envShort: string,
  groupName: string,
): string => `${prefix}-${envShort}-adgroup-${groupName}`;

/**
 * Service interface for managing Azure authorization operations.
 * Handles operations related to granting Azure resource access by managing
 * authorization configuration files in the pagopa/eng-azure-authorization repository.
 * These files are terraform.tfvars located at:
 * src/azure-subscriptions/subscriptions/{subscription}/terraform.tfvars
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AzureAuthorizationService {
  /**
   * Adds a bootstrap identity ID to the authorization configuration.
   * @param content - The current authorization file content
   * @param identityId - The identity ID to add
   * @returns Updated authorization file content or error
   */
  addIdentity(
    content: string,
    identityId: string,
  ): Result<string, AzureAuthorizationError>;

  /**
   * Checks if an identity ID already exists in the authorization configuration.
   * @param content - The authorization file content to search
   * @param identityId - The identity ID to check for
   * @returns true if the identity already exists
   */
  containsIdentityId(content: string, identityId: string): boolean;

  /**
   * Adds or updates AD groups in the tfvars content.
   * - If a group doesn't exist, adds it with empty members array
   * - If a group exists with different roles, updates the roles (preserving members)
   * - If a group exists with correct roles, skips it
   * @param content - The current authorization file content
   * @param prefix - The resource prefix (e.g., "dx")
   * @param envShort - The environment short name (e.g., "d")
   * @returns Updated authorization file content or error
   */
  upsertGroups(
    content: string,
    prefix: string,
    envShort: string,
  ): Result<string, AzureAuthorizationError>;
}

export type RequestAzureAuthorizationInput = z.infer<
  typeof requestAzureAuthorizationInputSchema
>;

/**
 * Base error class for Azure authorization-related errors.
 */
export class AzureAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureAuthorizationError";
  }
}

/**
 * Error thrown when attempting to add an identity that already exists.
 */
export class IdentityAlreadyExistsError extends AzureAuthorizationError {
  constructor(identityId: string) {
    super(`Identity "${identityId}" already exists in directory_readers`);
    this.name = "IdentityAlreadyExistsError";
  }
}

/**
 * Error thrown when the authorization file format is invalid or cannot be parsed.
 */
export class InvalidAuthorizationFileFormatError extends AzureAuthorizationError {
  constructor(details: string) {
    super(`Invalid authorization file format: ${details}`);
    this.name = "InvalidAuthorizationFileFormatError";
  }
}
