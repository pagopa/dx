import { describe, expect, it, vi } from "vitest";

import type { GitHubAppAuthSettings } from "../config.js";
import {
  buildGitHubAppOctokitAuthOptions,
  createTerrawizGitHubTokenResolver,
  createOctokitClient,
  resolveDxTeamMembers,
  type TeamMembersClient,
} from "../import-context.js";

type TeamMembersCall = [
  string,
  { org: string; per_page: number; team_slug: string },
];

describe("resolveDxTeamMembers", () => {
  it("resolves members from the configured GitHub team slug", async () => {
    const calls: TeamMembersCall[] = [];
    const teamMembersClient: TeamMembersClient = {
      paginate: async (route, parameters, mapFn) => {
        calls.push([route, parameters]);
        return [
          ...mapFn({
            data: [{ login: "zoe" }, { login: "alice" }, { login: "alice" }],
          }),
        ];
      },
    };

    const members = await resolveDxTeamMembers(teamMembersClient, {
      dxTeamSlug: "engineering-team-devex",
      organization: "pagopa",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe("GET /orgs/{org}/teams/{team_slug}/members");
    expect(calls[0]?.[1]).toEqual({
      org: "pagopa",
      per_page: 100,
      team_slug: "engineering-team-devex",
    });
    expect(members).toEqual(["alice", "zoe"]);
  });

  it("returns a sorted unique member list from the GitHub response", async () => {
    const teamMembersClient: TeamMembersClient = {
      paginate: async (_route, _parameters, mapFn) =>
        mapFn({
          data: [{ login: "zoe" }, { login: "alice" }, { login: "alice" }],
        }),
    };

    const members = await resolveDxTeamMembers(teamMembersClient, {
      dxTeamSlug: "engineering-team-devex",
      organization: "pagopa",
    });

    expect(members).toEqual(["alice", "zoe"]);
  });
});

describe("buildGitHubAppOctokitAuthOptions", () => {
  it("maps GitHub App credentials to Octokit auth options", () => {
    expect(
      buildGitHubAppOctokitAuthOptions({
        appId: 123,
        installationId: 456,
        privateKey: "-----BEGIN PRIVATE KEY-----\nprivate-key",
      }),
    ).toEqual({
      appId: 123,
      installationId: 456,
      privateKey: "-----BEGIN PRIVATE KEY-----\nprivate-key",
    });
  });
});

describe("createOctokitClient", () => {
  it("creates an Octokit instance configured for GitHub App auth", () => {
    const octokit = createOctokitClient({
      appId: 123,
      installationId: 456,
      privateKey: "-----BEGIN PRIVATE KEY-----\nprivate-key",
      type: "app",
    });

    expect(octokit).toBeInstanceOf(Object);
  });

  it("creates an Octokit instance configured for PAT auth", () => {
    const octokit = createOctokitClient({
      token: "ghp_legacy_token",
      type: "token",
    });

    expect(octokit).toBeInstanceOf(Object);
  });
});

describe("createTerrawizGitHubTokenResolver", () => {
  it("returns the configured PAT when PAT auth is used", async () => {
    const createInstallationTokenResolver = vi.fn(
      (_githubApp: GitHubAppAuthSettings) => async () =>
        "ghs_installation_token",
    );

    const resolveTerrawizGitHubToken = createTerrawizGitHubTokenResolver(
      {
        token: "ghp_legacy_token",
        type: "token",
      },
      createInstallationTokenResolver,
    );

    await expect(resolveTerrawizGitHubToken()).resolves.toBe(
      "ghp_legacy_token",
    );
    expect(createInstallationTokenResolver).not.toHaveBeenCalled();
  });

  it("creates an installation token resolver when GitHub App auth is used", async () => {
    const createInstallationTokenResolver = vi.fn(
      (githubApp: GitHubAppAuthSettings) => async () =>
        `ghs_${githubApp.installationId}`,
    );

    const resolveTerrawizGitHubToken = createTerrawizGitHubTokenResolver(
      {
        appId: 123,
        installationId: 456,
        privateKey: "-----BEGIN PRIVATE KEY-----\nprivate-key",
        type: "app",
      },
      createInstallationTokenResolver,
    );

    expect(createInstallationTokenResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 123,
        installationId: 456,
        privateKey: "-----BEGIN PRIVATE KEY-----\nprivate-key",
      }),
    );
    await expect(resolveTerrawizGitHubToken()).resolves.toBe("ghs_456");
  });
});
