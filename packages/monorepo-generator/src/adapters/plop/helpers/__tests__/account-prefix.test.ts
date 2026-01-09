import { describe, expect, it } from "vitest";

import { CloudAccount } from "../../../../domain/cloud-account.js";
import { accountPrefix } from "../account-prefix.js";

const createMockCloudAccount = (
  overrides: Partial<CloudAccount> = {},
): CloudAccount => ({
  csp: "azure",
  defaultLocation: "westeurope",
  displayName: "Test-Account",
  id: "test-account-id",
  ...overrides,
});

describe("accountPrefix", () => {
  it("should combine csp and lowercase displayName with underscore separator", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "MyAccount",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_myaccount");
  });

  it("should replace hyphens in displayName with underscores", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "My-Account-Name",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_my_account_name");
  });

  it("should handle displayName with multiple consecutive hyphens", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "My--Double--Hyphen",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_my__double__hyphen");
  });

  it("should handle displayName that is already lowercase", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "lowercase-name",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_lowercase_name");
  });

  it("should handle displayName with mixed case", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "MixedCase-DisplayName",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_mixedcase_displayname");
  });

  it("should handle displayName without hyphens", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "SimpleAccount",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_simpleaccount");
  });

  it("should handle displayName with numbers", () => {
    const account = createMockCloudAccount({
      csp: "azure",
      displayName: "Account-123-Test",
    });

    const result = accountPrefix(account);

    expect(result).toBe("azure_account_123_test");
  });
});
