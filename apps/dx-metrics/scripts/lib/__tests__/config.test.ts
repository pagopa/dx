import { describe, expect, it } from "vitest";

import {
  normalizeGitHubAppPrivateKey,
  resolveImportSettings,
} from "../config.js";

describe("resolveImportSettings", () => {
  it("keeps dxTeamSlug from the config file", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {
        GITHUB_CLIENT_ID: "Iv1.client-id",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----",
      },
    );

    expect(settings.dxTeamSlug).toBe("engineering-team-devex");
  });

  it("applies defaults for dxRepo, organization, repositories, and GitHub App auth", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {
        GITHUB_CLIENT_ID: "Iv1.client-id",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----",
      },
    );

    expect(settings.dxRepo).toBe("dx");
    expect(settings.githubAuth).toEqual({
      appId: "Iv1.client-id",
      installationId: 456,
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nprivate-key\n-----END PRIVATE KEY-----",
      type: "app",
    });
    expect(settings.organization).toBe("pagopa");
    expect(settings.repositories).toEqual([]);
  });

  it("falls back to the GitHub PAT when GitHub App credentials are not configured", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      { GITHUB_TOKEN: "ghp_legacy_token" },
    );

    expect(settings.githubAuth).toEqual({
      token: "ghp_legacy_token",
      type: "token",
    });
  });

  it("falls back to GITHUB_APP_ID when GITHUB_CLIENT_ID is not configured", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {
        GITHUB_APP_ID: "123",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----",
      },
    );

    expect(settings.githubAuth).toEqual({
      appId: 123,
      installationId: 456,
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nprivate-key\n-----END PRIVATE KEY-----",
      type: "app",
    });
  });

  it("throws when GitHub App credentials are incomplete", () => {
    expect(() =>
      resolveImportSettings(
        { dxTeamSlug: "engineering-team-devex" },
        {
          GITHUB_CLIENT_ID: "Iv1.client-id",
          GITHUB_APP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----",
        },
      ),
    ).toThrow(
      "Incomplete GitHub App credentials. Set GITHUB_CLIENT_ID or GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY.",
    );
  });

  it("prefers GITHUB_CLIENT_ID over GITHUB_APP_ID and GITHUB_TOKEN", () => {
    const settings = resolveImportSettings(
      { dxTeamSlug: "engineering-team-devex" },
      {
        GITHUB_CLIENT_ID: "Iv1.client-id",
        GITHUB_APP_ID: "123",
        GITHUB_APP_INSTALLATION_ID: "456",
        GITHUB_APP_PRIVATE_KEY:
          "-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----",
        GITHUB_TOKEN: "ghp_legacy_token",
      },
    );

    expect(settings.githubAuth).toEqual({
      appId: "Iv1.client-id",
      installationId: 456,
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nprivate-key\n-----END PRIVATE KEY-----",
      type: "app",
    });
  });

  it("rejects a non-numeric GITHUB_APP_ID when GITHUB_CLIENT_ID is absent", () => {
    expect(() =>
      resolveImportSettings(
        { dxTeamSlug: "engineering-team-devex" },
        {
          GITHUB_APP_ID: "not-a-number",
          GITHUB_APP_INSTALLATION_ID: "456",
          GITHUB_APP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----",
        },
      ),
    ).toThrow("Invalid GitHub App credentials:");
  });

  it("throws when neither GitHub App credentials nor the PAT are configured", () => {
    expect(() =>
      resolveImportSettings({ dxTeamSlug: "engineering-team-devex" }, {}),
    ).toThrow(
      "GitHub authentication is required. Configure either GITHUB_CLIENT_ID or GITHUB_APP_ID, plus GITHUB_APP_INSTALLATION_ID and GITHUB_APP_PRIVATE_KEY, or GITHUB_TOKEN.",
    );
  });
});

describe("normalizeGitHubAppPrivateKey", () => {
  it("converts escaped newlines to PEM line breaks", () => {
    expect(
      normalizeGitHubAppPrivateKey(
        "-----BEGIN PRIVATE KEY-----\\nprivate-key\\n-----END PRIVATE KEY-----",
      ),
    ).toBe(
      "-----BEGIN PRIVATE KEY-----\nprivate-key\n-----END PRIVATE KEY-----",
    );
  });
});
