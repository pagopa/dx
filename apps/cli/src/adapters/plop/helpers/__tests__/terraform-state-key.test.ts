/**
 * Tests for Terraform state key generation used by the environment generator.
 */
import { describe, expect, it } from "vitest";

import { terraformStateKey } from "../terraform-state-key.js";

describe("terraformStateKey", () => {
  it("supports valid directory names beyond state-key naming rules", () => {
    expect(terraformStateKey("resources", "frontend/mobile_app")).toBe(
      "resources/frontend/mobile_app.tfstate",
    );
    expect(terraformStateKey("resources", "frontend/mobile app")).toBe(
      "resources/frontend/mobile app.tfstate",
    );
  });

  it("supports hyphenated names", () => {
    const result = terraformStateKey("mcp-server", "mobile-app");

    expect(result).toBe("mcp-server/mobile-app.tfstate");
  });

  it("rejects path separators in layer names", () => {
    expect(() => terraformStateKey("core/root")).toThrow(
      /Terraform state names must use lowercase letters, numbers, and single hyphens/u,
    );
  });

  it("rejects invalid relative root paths", () => {
    expect(() => terraformStateKey("resources", "../outside")).toThrow(
      /Terraform state paths must be relative paths with unambiguous directory separators/u,
    );

    expect(() => terraformStateKey("resources", "frontend//mobile")).toThrow(
      /Terraform state paths must be relative paths with unambiguous directory separators/u,
    );
    expect(() => terraformStateKey("resources", "/frontend/mobile")).toThrow(
      /Terraform state paths must be relative paths with unambiguous directory separators/u,
    );
    expect(() => terraformStateKey("resources", "C:/frontend/mobile")).toThrow(
      /Terraform state paths must be relative paths with unambiguous directory separators/u,
    );
    expect(() => terraformStateKey("resources", "frontend\\mobile")).toThrow(
      /Terraform state paths must be relative paths with unambiguous directory separators/u,
    );
  });
});
