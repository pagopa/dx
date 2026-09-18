/**
 * Tests for Terraform state key generation used by the environment generator.
 */
import { describe, expect, it } from "vitest";

import { Payload } from "../../generators/environment/prompts.js";
import { terraformStateKey } from "../terraform-state-key.js";

const createMockContext = (
  overrides: Partial<Pick<Payload, "workspace">> = {},
): Pick<Payload, "workspace"> => ({
  workspace: {
    domain: "shared",
  },
  ...overrides,
});

describe("terraformStateKey", () => {
  it("returns keys using the domain/scope convention", () => {
    const result = terraformStateKey(createMockContext(), "bootstrapper");

    expect(result).toBe("shared/bootstrapper.tfstate");
  });

  it("keeps the shared core state at the root of the storage account", () => {
    expect(terraformStateKey(createMockContext(), "core")).toBe("core.tfstate");

    expect(
      terraformStateKey(
        createMockContext({ workspace: { domain: "api" } }),
        "core",
      ),
    ).toBe("core.tfstate");
  });

  it("supports hyphenated names", () => {
    const result = terraformStateKey(
      createMockContext({
        workspace: { domain: "playground" },
      }),
      "mcp-server",
    );

    expect(result).toBe("playground/mcp-server.tfstate");
  });

  it("rejects names that would create nested paths", () => {
    expect(() => terraformStateKey(createMockContext(), "core/root")).toThrow(
      /Terraform state name may contain only lowercase letters, numbers, and hyphens/u,
    );
  });

  it("rejects names with uppercase letters or surrounding spaces", () => {
    expect(() => terraformStateKey(createMockContext(), "Mcp-Server")).toThrow(
      /Terraform state name may contain only lowercase letters, numbers, and hyphens/u,
    );

    expect(() =>
      terraformStateKey(createMockContext(), " mcp-server "),
    ).toThrow(
      /Terraform state name may contain only lowercase letters, numbers, and hyphens/u,
    );
  });
});
