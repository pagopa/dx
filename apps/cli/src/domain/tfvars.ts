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
 * Input validation schema for the request Azure authorization use case.
 */
export const requestAzureAuthorizationInputSchema = z.object({
  bootstrapIdentityId: BootstrapIdentityId,
  subscriptionName: SubscriptionName,
});

export type RequestAzureAuthorizationInput = z.infer<
  typeof requestAzureAuthorizationInputSchema
>;

/**
 * Service interface for manipulating terraform.tfvars files.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface TfvarsService {
  /**
   * Appends a service principal ID to the directory_readers.service_principals_name list.
   * @param content - The current tfvars file content
   * @param identityId - The identity ID to append
   * @returns Updated tfvars content or error
   */
  appendToDirectoryReaders(
    content: string,
    identityId: string,
  ): Result<string, TfvarsError>;

  /**
   * Checks if a service principal ID already exists in the directory_readers list.
   * @param content - The tfvars file content to search
   * @param identityId - The identity ID to check for
   * @returns true if the identity already exists
   */
  containsServicePrincipal(content: string, identityId: string): boolean;
}

/**
 * Base error class for tfvars-related errors.
 */
export class TfvarsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TfvarsError";
  }
}

/**
 * Error thrown when attempting to add an identity that already exists.
 */
export class IdentityAlreadyExistsError extends TfvarsError {
  constructor(identityId: string) {
    super(`Identity "${identityId}" already exists in directory_readers`);
    this.name = "IdentityAlreadyExistsError";
  }
}

/**
 * Error thrown when the tfvars file format is invalid or cannot be parsed.
 */
export class InvalidTfvarsFormatError extends TfvarsError {
  constructor(details: string) {
    super(`Invalid tfvars format: ${details}`);
    this.name = "InvalidTfvarsFormatError";
  }
}
