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
 * Input validation schema for the request authorization use case.
 */
export const requestAuthorizationInputSchema = z.object({
  bootstrapIdentityId: BootstrapIdentityId,
  subscriptionName: SubscriptionName,
});

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
