/** This module verifies terrawiz process environment resolution for Terraform imports. */

import { describe, expect, it } from "vitest";

import { createTerrawizEnvironment } from "../terraform.js";

describe("createTerrawizEnvironment", () => {
  it("adds the resolved token to the terrawiz child-process environment", async () => {
    const environment = await createTerrawizEnvironment({
      resolveTerrawizGitHubToken: async () => "ghs_installation_token",
      runtimeEnvironment: {
        NODE_ENV: "production",
        PATH: "/usr/bin",
      },
    });

    expect(environment).toEqual({
      GITHUB_TOKEN: "ghs_installation_token",
      NODE_ENV: "production",
      PATH: "/usr/bin",
    });
  });

  it("overrides an inherited GitHub token with the terrawiz token", async () => {
    const environment = await createTerrawizEnvironment({
      resolveTerrawizGitHubToken: async () => "ghs_installation_token",
      runtimeEnvironment: {
        GITHUB_TOKEN: "ghp_legacy_token",
        NODE_ENV: "production",
        PATH: "/usr/bin",
      },
    });

    expect(environment.GITHUB_TOKEN).toBe("ghs_installation_token");
    expect(environment.PATH).toBe("/usr/bin");
  });
});
