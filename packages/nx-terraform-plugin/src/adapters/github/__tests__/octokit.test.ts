import { beforeEach, describe, expect, it, vi } from "vitest";

const octokitMocks = vi.hoisted(() => {
  const auth = vi.fn();
  const createInOrg = vi.fn();
  const createForAuthenticatedUser = vi.fn();
  const get = vi.fn();
  const getAuthenticated = vi.fn();
  const getByUsername = vi.fn();
  const getOrgInstallation = vi.fn();
  const revokeInstallationAccessToken = vi.fn();
  const Octokit = vi.fn(function Octokit() {
    return {
      rest: {
        apps: {
          getOrgInstallation,
          revokeInstallationAccessToken,
        },
        repos: {
          createForAuthenticatedUser,
          createInOrg,
          get,
        },
        users: {
          getAuthenticated,
          getByUsername,
        },
      },
    };
  });

  return {
    auth,
    createForAuthenticatedUser,
    createInOrg,
    get,
    getAuthenticated,
    getByUsername,
    getOrgInstallation,
    Octokit,
    revokeInstallationAccessToken,
  };
});

vi.mock("@octokit/auth-app", () => ({
  createAppAuth: vi.fn(() => octokitMocks.auth),
}));

vi.mock("octokit", () => ({
  Octokit: octokitMocks.Octokit,
}));

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";

import {
  createGitHubAppOctokit,
  createGitHubAppToken,
  ensureGitHubRepository,
  revokeGitHubAppToken,
} from "../octokit.ts";

const appCredentials = {
  clientId: "Iv23.client-id",
  privateKey: "private-key",
};
const token = "installation-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createGitHubAppOctokit", () => {
  it("creates an app-authenticated Octokit client", () => {
    createGitHubAppOctokit(appCredentials);

    expect(octokitMocks.Octokit).toHaveBeenCalledWith({
      auth: {
        appId: "Iv23.client-id",
        privateKey: "private-key",
      },
      authStrategy: createAppAuth,
    });
  });
});

describe("createGitHubAppToken", () => {
  it("creates an owner installation token with contents write permission", async () => {
    octokitMocks.getOrgInstallation.mockResolvedValue({ data: { id: 123 } });
    octokitMocks.auth.mockResolvedValue({ token });
    const appOctokit = createGitHubAppOctokit(appCredentials);

    await expect(
      createGitHubAppToken("pagopa-dx", appCredentials, appOctokit),
    ).resolves.toBe(token);

    expect(octokitMocks.getOrgInstallation).toHaveBeenCalledWith({
      org: "pagopa-dx",
    });
    expect(createAppAuth).toHaveBeenLastCalledWith({
      appId: "Iv23.client-id",
      installationId: 123,
      privateKey: "private-key",
    });
    expect(octokitMocks.auth).toHaveBeenCalledWith({
      permissions: {
        contents: "write",
      },
      type: "installation",
    });
  });
});

describe("revokeGitHubAppToken", () => {
  it("revokes the installation token", async () => {
    octokitMocks.revokeInstallationAccessToken.mockResolvedValue(undefined);
    const octokit = new Octokit({ auth: token });

    await expect(revokeGitHubAppToken(octokit)).resolves.toBeUndefined();

    expect(octokitMocks.Octokit).toHaveBeenCalledWith({ auth: token });
    expect(octokitMocks.revokeInstallationAccessToken).toHaveBeenCalledTimes(1);
  });
});

describe("ensureGitHubRepository", () => {
  it("returns created false when the repository exists", async () => {
    octokitMocks.get.mockResolvedValue({ data: {} });
    const octokit = new Octokit({ auth: token });

    const result = await ensureGitHubRepository(
      "pagopa-dx",
      "terraform-aws-x",
      octokit,
    );

    expect(result).toBeUndefined();
    expect(octokitMocks.get).toHaveBeenCalledWith({
      owner: "pagopa-dx",
      repo: "terraform-aws-x",
    });
    expect(octokitMocks.getByUsername).not.toHaveBeenCalled();
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });

  it("creates the repository when octokit reports a 404", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    octokitMocks.get.mockRejectedValueOnce(notFoundError);
    octokitMocks.getByUsername.mockResolvedValueOnce({
      data: { type: "Organization" },
    });
    octokitMocks.createInOrg.mockResolvedValue({ data: {} });
    const octokit = new Octokit({ auth: token });

    const result = await ensureGitHubRepository(
      "pagopa-dx",
      "terraform-aws-x",
      octokit,
    );

    expect(result).toBeUndefined();
    expect(octokitMocks.getByUsername).toHaveBeenCalledWith({
      username: "pagopa-dx",
    });
    expect(octokitMocks.createInOrg).toHaveBeenCalledWith({
      name: "terraform-aws-x",
      org: "pagopa-dx",
      visibility: "public",
    });
  });

  it("creates the repository for the authenticated user when owner is a user profile", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    octokitMocks.get.mockRejectedValueOnce(notFoundError);
    octokitMocks.getByUsername.mockResolvedValueOnce({
      data: { type: "User" },
    });
    octokitMocks.getAuthenticated.mockResolvedValueOnce({
      data: { login: "pagopa-user" },
    });
    octokitMocks.createForAuthenticatedUser.mockResolvedValueOnce({
      data: {},
    });
    const octokit = new Octokit({ auth: token });

    const result = await ensureGitHubRepository(
      "pagopa-user",
      "terraform-aws-x",
      octokit,
    );

    expect(result).toBeUndefined();
    expect(octokitMocks.getByUsername).toHaveBeenCalledWith({
      username: "pagopa-user",
    });
    expect(octokitMocks.getAuthenticated).toHaveBeenCalledTimes(1);
    expect(octokitMocks.createForAuthenticatedUser).toHaveBeenCalledWith({
      name: "terraform-aws-x",
      visibility: "public",
    });
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });

  it("fails when the requested user owner differs from the authenticated user", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    octokitMocks.get.mockRejectedValueOnce(notFoundError);
    octokitMocks.getByUsername.mockResolvedValueOnce({
      data: { type: "User" },
    });
    octokitMocks.getAuthenticated.mockResolvedValueOnce({
      data: { login: "another-user" },
    });
    const octokit = new Octokit({ auth: token });

    await expect(
      ensureGitHubRepository("pagopa-user", "terraform-aws-x", octokit),
    ).rejects.toThrow(
      'Cannot create repository for user owner "pagopa-user" with authenticated user "another-user".',
    );

    expect(octokitMocks.getByUsername).toHaveBeenCalledWith({
      username: "pagopa-user",
    });
    expect(octokitMocks.createForAuthenticatedUser).not.toHaveBeenCalled();
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });

  it("fails with a clear error when a user-owned repository is published with app credentials", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    octokitMocks.get.mockRejectedValueOnce(notFoundError);
    octokitMocks.getByUsername.mockResolvedValueOnce({
      data: { type: "User" },
    });
    octokitMocks.getAuthenticated.mockRejectedValueOnce(
      Object.assign(new Error("Resource not accessible by integration"), {
        status: 403,
      }),
    );
    const octokit = new Octokit({ auth: token });

    await expect(
      ensureGitHubRepository("pagopa-user", "terraform-aws-x", octokit),
    ).rejects.toThrow(
      'Cannot create repository for user owner "pagopa-user" without user-scoped GitHub credentials. GitHub App installation tokens can create organization repositories, but not user-owned repositories.',
    );

    expect(octokitMocks.getByUsername).toHaveBeenCalledWith({
      username: "pagopa-user",
    });
    expect(octokitMocks.createForAuthenticatedUser).not.toHaveBeenCalled();
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });
});
