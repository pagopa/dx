import { describe, expect, it } from "vitest";

import { Payload } from "../../generators/environment/prompts.js";
import { resourcePrefix } from "../resource-prefix.js";

const createMockPayload = (
  overrides: Partial<Pick<Payload, "env" | "workspace">> = {},
): Pick<Payload, "env" | "workspace"> => ({
  env: {
    cloudAccounts: [],
    name: "dev",
    prefix: "dx",
  },
  workspace: {
    domain: "",
  },
  ...overrides,
});

describe("resourcePrefix", () => {
  it("should return prefix with env prefix and environment short code when domain is empty", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "dev",
        prefix: "dx",
      },
      workspace: {
        domain: "",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("dx-d");
  });

  it("should return prefix with env prefix, environment short code, and domain when domain is provided", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "dev",
        prefix: "dx",
      },
      workspace: {
        domain: "api",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("dx-d-api");
  });

  it("should handle prod environment with short code 'p'", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "prod",
        prefix: "pgo",
      },
      workspace: {
        domain: "core",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("pgo-p-core");
  });

  it("should handle uat environment with short code 'u'", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [],
        name: "uat",
        prefix: "test",
      },
      workspace: {
        domain: "web",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("test-u-web");
  });

  it("should convert result to lowercase", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [
          {
            csp: "azure",
            defaultLocation: "westeurope",
            displayName: "Test Account",
            id: "test-account-id",
          },
        ],
        name: "prod",
        prefix: "UPPER",
      },
      workspace: {
        domain: "DOMAIN",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("upper-p-domain");
  });

  it("should handle different prefix lengths", () => {
    const payload = createMockPayload({
      env: {
        cloudAccounts: [
          {
            csp: "azure",
            defaultLocation: "westeurope",
            displayName: "Test Account",
            id: "test-account-id",
          },
        ],
        name: "dev",
        prefix: "ab",
      },
      workspace: {
        domain: "",
      },
    });

    const result = resourcePrefix(payload);

    expect(result).toBe("ab-d");
  });
});
