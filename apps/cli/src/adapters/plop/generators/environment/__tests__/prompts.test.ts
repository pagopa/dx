// Tests for workspaceSchema transforms (lowercase and trim on domain).
import { describe, expect, it } from "vitest";

import type { CloudAccount } from "../../../../../domain/cloud-account.js";
import type { EnvironmentInitStatus } from "../../../../../domain/environment.js";

import { formatInitializationDetails, workspaceSchema } from "../prompts.js";

describe("workspaceSchema — domain transforms", () => {
  it("lowercases an uppercase domain", () => {
    const result = workspaceSchema.safeParse({ domain: "API" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("lowercases a mixed-case domain", () => {
    const result = workspaceSchema.safeParse({ domain: "MyDomain" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("mydomain");
  });

  it("trims leading and trailing whitespace from domain", () => {
    const result = workspaceSchema.safeParse({ domain: " aPi " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("api");
  });

  it("defaults domain to empty string when not provided", () => {
    const result = workspaceSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data.domain).toBe("");
  });
});

describe("formatInitializationDetails", () => {
  const account = (overrides: Partial<CloudAccount> = {}): CloudAccount => ({
    csp: "azure",
    defaultLocation: "italynorth",
    displayName: "DEV-FooBar",
    id: "sub-123",
    ...overrides,
  });

  const notInitializedStatus = (
    issues: (EnvironmentInitStatus & { initialized: false })["issues"],
  ): EnvironmentInitStatus & { initialized: false } => ({
    initialized: false,
    issues,
  });

  it("lists each uninitialized cloud account by displayName", () => {
    const status = notInitializedStatus([
      {
        cloudAccount: account({ displayName: "DEV-A" }),
        type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
      },
      {
        cloudAccount: account({ displayName: "DEV-B" }),
        type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
      },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).toContain('Azure subscription "DEV-A"');
    expect(output).toContain('Azure subscription "DEV-B"');
    expect(output).toContain("managed identity");
    expect(output).toContain("OIDC");
    expect(output).toContain("ARM_CLIENT_ID");
    expect(output).toContain("ARM_SUBSCRIPTION_ID");
    expect(output).not.toContain("ARM_TENANT_ID");
    expect(output).toContain("Key Vault");
  });

  it("includes the Terraform backend section when MISSING_REMOTE_BACKEND issue is present", () => {
    const status = notInitializedStatus([
      { cloudAccount: account(), type: "CLOUD_ACCOUNT_NOT_INITIALIZED" },
      { type: "MISSING_REMOTE_BACKEND" },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).toContain("Terraform remote backend");
    expect(output).toContain("Storage Account");
  });

  it("omits the Terraform backend section when no MISSING_REMOTE_BACKEND issue is present", () => {
    const status = notInitializedStatus([
      { cloudAccount: account(), type: "CLOUD_ACCOUNT_NOT_INITIALIZED" },
    ]);

    const output = formatInitializationDetails(status);

    expect(output).not.toContain("Terraform remote backend");
  });

  it("omits the cloud account section when no CLOUD_ACCOUNT_NOT_INITIALIZED issues are present", () => {
    const status = notInitializedStatus([{ type: "MISSING_REMOTE_BACKEND" }]);

    const output = formatInitializationDetails(status);

    expect(output).not.toContain("Azure subscription");
    expect(output).toContain("Terraform remote backend");
  });

  it("returns an empty string when there are no relevant issues", () => {
    const status = notInitializedStatus([]);

    expect(formatInitializationDetails(status)).toBe("");
  });
});
