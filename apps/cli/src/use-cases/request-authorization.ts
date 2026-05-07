/**
 * Request Authorization Use Case
 *
 * Orchestrates an authorization request by delegating to the
 * AuthorizationService.
 */

import { ResultAsync } from "neverthrow";

import {
  AuthorizationError,
  AuthorizationResult,
  AuthorizationService,
  RequestAuthorizationInput,
} from "../domain/authorization.js";

/**
 * Creates a function that requests authorization for a bootstrap identity.
 *
 * @param authorizationService - The service handling authorization logic
 * @returns A function that takes input and returns a ResultAsync with the authorization result
 */
export const requestAuthorization =
  (authorizationService: AuthorizationService) =>
  (
    input: RequestAuthorizationInput,
  ): ResultAsync<AuthorizationResult, AuthorizationError> =>
    authorizationService.requestAuthorization(input);
