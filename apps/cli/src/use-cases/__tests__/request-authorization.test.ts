/**
 * Tests for the requestAuthorization use case.
 */

import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import {
  AuthorizationError,
  AuthorizationResult,
  AuthorizationService,
  RequestAuthorizationInput,
  requestAuthorizationInputSchema,
} from "../../domain/authorization.js";
import { requestAuthorization } from "../request-authorization.js";

const makeSampleInput = (): RequestAuthorizationInput =>
  requestAuthorizationInputSchema.parse({
    bootstrapIdentityId: "test-bootstrap-identity-id",
    envShort: "d",
    prefix: "test",
    repoName: "test-repo",
    repoOwner: "pagopa",
    subscriptionName: "test-subscription",
  });

describe("requestAuthorization", () => {
  it("accepts resource prefixes containing numbers", () => {
    const result = requestAuthorizationInputSchema.safeParse({
      bootstrapIdentityId: "dxt0-d-itn-bootstrap-id-01",
      envShort: "d",
      prefix: "dxt0",
      repoName: "test-repo",
      repoOwner: "pagopa",
      subscriptionName: "DEV-DEVEX",
    });

    expect(result.success).toBe(true);
  });

  it("should return the authorization result on success", async () => {
    const authorizationService = mock<AuthorizationService>();
    const input = makeSampleInput();
    const expectedResult = new AuthorizationResult(
      "https://github.com/pagopa/eng-azure-authorization/pull/42",
    );

    authorizationService.requestAuthorization.mockReturnValue(
      okAsync(expectedResult),
    );

    const result = await requestAuthorization(authorizationService)(input);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().url).toBe(
      "https://github.com/pagopa/eng-azure-authorization/pull/42",
    );
    expect(authorizationService.requestAuthorization).toHaveBeenCalledWith(
      input,
    );
  });

  it("should propagate errors from the authorization service", async () => {
    const authorizationService = mock<AuthorizationService>();
    const input = makeSampleInput();

    authorizationService.requestAuthorization.mockReturnValue(
      errAsync(new AuthorizationError("Unable to update file")),
    );

    const result = await requestAuthorization(authorizationService)(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthorizationError);
  });

  it("should propagate generic authorization errors", async () => {
    const authorizationService = mock<AuthorizationService>();
    const input = makeSampleInput();

    authorizationService.requestAuthorization.mockReturnValue(
      errAsync(new AuthorizationError("Something went wrong")),
    );

    const result = await requestAuthorization(authorizationService)(input);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthorizationError);
  });
});
