/**
 * Authorization Domain
 *
 * Provides types and interfaces for requesting cloud authorization.
 * This module is technology-agnostic: it does not depend on any specific
 * cloud provider or version-control platform.
 */

import { ResultAsync } from "neverthrow";
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
 * Validates that the ID contains only lowercase letters, numbers, and hyphens to prevent injection attacks.
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
 * Input validation schema for the request authorization use case.
 */
export const requestAuthorizationInputSchema = z.object({
  bootstrapIdentityId: BootstrapIdentityId,
  envShort: EnvShort,
  prefix: ResourcePrefix,
  repoName: z.string().min(1),
  subscriptionName: SubscriptionName,
});

/**
 * Configuration for an AD group with its roles and members.
 */
export type GroupConfig = {
  readonly members: readonly string[];
  readonly name: string;
  readonly roles: readonly string[];
};

/**
 * Specification for a default AD group (name suffix + default roles).
 */
type DefaultGroupSpec = {
  readonly groupName: string;
  readonly roles: readonly string[];
};

/**
 * Default AD groups that should exist for each subscription.
 * Naming pattern: <prefix>-<envShort>-adgroup-<groupName>
 */
export const DEFAULT_GROUP_SPECS: readonly DefaultGroupSpec[] = [
  { groupName: "admin", roles: ["Owner"] },
  { groupName: "developers", roles: ["Owner"] },
  {
    groupName: "operations",
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
  },
  { groupName: "security", roles: ["Reader", "Support Request Contributor"] },
  {
    groupName: "technical-project-managers",
    roles: ["Reader", "Monitoring Contributor", "Support Request Contributor"],
  },
  {
    groupName: "product-owners",
    roles: ["Reader", "Support Request Contributor"],
  },
  { groupName: "externals", roles: ["Owner"] },
  {
    groupName: "oncall",
    roles: [
      "Reader",
      "Monitoring Contributor",
      "Support Request Contributor",
      "Storage Blob Data Reader",
      "Storage Queue Data Reader",
      "Cosmos DB Account Reader Role",
    ],
  },
];

/**
 * Generates the full AD group name from its components.
 */
export const makeGroupName = (
  prefix: string,
  envShort: string,
  groupName: string,
): string => `${prefix}-${envShort}-adgroup-${groupName}`;

/**
 * Service interface for requesting cloud authorization.
 * Implementations handle the platform-specific details of granting access.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AuthorizationService {
  requestAuthorization(
    input: RequestAuthorizationInput,
  ): ResultAsync<AuthorizationResult, AuthorizationError>;
}

export type RequestAuthorizationInput = z.infer<
  typeof requestAuthorizationInputSchema
>;

/**
 * Base error class for authorization-related errors.
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Result returned by a successful authorization request.
 */
export class AuthorizationResult {
  constructor(public readonly url: string) {}
}

/**
 * Error thrown when attempting to add an identity that already exists.
 */
export class IdentityAlreadyExistsError extends AuthorizationError {
  constructor(identityId: string) {
    super(`Identity "${identityId}" already exists`);
    this.name = "IdentityAlreadyExistsError";
  }
}

/**
 * Error thrown when the authorization configuration format is invalid or cannot be parsed.
 */
export class InvalidAuthorizationFileFormatError extends AuthorizationError {
  constructor(details: string) {
    super(`Invalid authorization file format: ${details}`);
    this.name = "InvalidAuthorizationFileFormatError";
  }
}
