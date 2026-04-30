/**
 * Tests for authorizeCloudAccounts in the init command.
 */

import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import type { Payload as EnvironmentPayload } from "../../../plop/generators/environment/index.js";

import {
  AuthorizationError,
  AuthorizationResult,
  AuthorizationService,
} from "../../../../domain/authorization.js";
import { authorizeCloudAccounts } from "../add.js";

const makeEnvPayload = (
  overrides: Partial<EnvironmentPayload> = {},
): EnvironmentPayload => ({
  env: {
    cloudAccounts: [
      {
        csp: "azure",
        defaultLocation: "italynorth",
        displayName: "DEV-FooBar",
        id: "sub-123",
      },
    ],
    name: "dev",
    prefix: "dx",
  },
  github: { owner: "pagopa", repo: "test-repo" },
  tags: { BusinessUnit: "BU", CostCenter: "TS000", ManagementTeam: "MT" },
  workspace: { domain: "" },
  ...overrides,
});

describe("authorizeCloudAccounts", () => {
  it("returns empty array when init is undefined (env already initialized)", async () => {
    const authService = mock<AuthorizationService>();
    const envPayload = makeEnvPayload({ init: undefined });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
    expect(authService.requestAuthorization).not.toHaveBeenCalled();
  });

  it("returns empty array when cloudAccountsToInitialize is empty", async () => {
    const authService = mock<AuthorizationService>();
    const envPayload = makeEnvPayload({
      init: { cloudAccountsToInitialize: [] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
  });

  it("requests authorization for each initialized account", async () => {
    const authService = mock<AuthorizationService>();
    const expectedPr = new AuthorizationResult(
      "https://github.com/pagopa/eng-azure-authorization/pull/42",
    );
    authService.requestAuthorization.mockReturnValue(okAsync(expectedPr));

    const account = {
      csp: "azure" as const,
      defaultLocation: "italynorth",
      displayName: "DEV-FooBar",
      id: "sub-123",
    };

    const envPayload = makeEnvPayload({
      env: {
        cloudAccounts: [account],
        name: "dev",
        prefix: "dx",
      },
      init: { cloudAccountsToInitialize: [account] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([expectedPr]);

    expect(authService.requestAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        bootstrapIdentityId: "dx-d-itn-bootstrap-id-01",
        envShort: "d",
        prefix: "dx",
        subscriptionName: "DEV-FooBar",
      }),
    );
  });

  it("computes correct identity for westeurope location", async () => {
    const authService = mock<AuthorizationService>();
    authService.requestAuthorization.mockReturnValue(
      okAsync(new AuthorizationResult("https://example.com/pr/1")),
    );

    const account = {
      csp: "azure" as const,
      defaultLocation: "westeurope",
      displayName: "PROD-Bar",
      id: "sub-456",
    };

    const envPayload = makeEnvPayload({
      env: {
        cloudAccounts: [account],
        name: "prod",
        prefix: "io",
      },
      init: { cloudAccountsToInitialize: [account] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    expect(authService.requestAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        bootstrapIdentityId: "io-p-weu-bootstrap-id-01",
        envShort: "p",
        prefix: "io",
        subscriptionName: "PROD-Bar",
      }),
    );
  });

  it("skips accounts with unsupported locations", async () => {
    const authService = mock<AuthorizationService>();
    const account = {
      csp: "azure" as const,
      defaultLocation: "eastus",
      displayName: "DEV-Unsupported",
      id: "sub-789",
    };

    const envPayload = makeEnvPayload({
      init: { cloudAccountsToInitialize: [account] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([]);
    expect(authService.requestAuthorization).not.toHaveBeenCalled();
  });

  it("continues when authorization fails for one account", async () => {
    const authService = mock<AuthorizationService>();

    const account1 = {
      csp: "azure" as const,
      defaultLocation: "italynorth",
      displayName: "DEV-First",
      id: "sub-1",
    };
    const account2 = {
      csp: "azure" as const,
      defaultLocation: "italynorth",
      displayName: "DEV-Second",
      id: "sub-2",
    };

    const expectedPr = new AuthorizationResult("https://example.com/pr/2");

    authService.requestAuthorization
      .mockReturnValueOnce(
        errAsync(new AuthorizationError("Branch already exists")),
      )
      .mockReturnValueOnce(okAsync(expectedPr));

    const envPayload = makeEnvPayload({
      env: {
        cloudAccounts: [account1, account2],
        name: "dev",
        prefix: "dx",
      },
      init: { cloudAccountsToInitialize: [account1, account2] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    const prs = result._unsafeUnwrap();
    expect(prs).toHaveLength(1);
    expect(prs[0]).toEqual(expectedPr);
  });

  it("returns a no-op authorization result when nothing changed", async () => {
    const authService = mock<AuthorizationService>();
    const account = {
      csp: "azure" as const,
      defaultLocation: "italynorth",
      displayName: "DEV-Existing",
      id: "sub-exists",
    };

    // No-op result: Ok with no URL (identity + groups already configured)
    authService.requestAuthorization.mockReturnValue(
      okAsync(new AuthorizationResult()),
    );

    const envPayload = makeEnvPayload({
      init: { cloudAccountsToInitialize: [account] },
    });

    const result = await authorizeCloudAccounts(authService)(envPayload);

    expect(result.isOk()).toBe(true);
    // The no-op result is still collected but has no URL
    const prs = result._unsafeUnwrap();
    expect(prs).toHaveLength(1);
    expect(prs[0].url).toBeUndefined();
  });
});
