import { beforeEach, describe, expect, it, vi } from "vitest";

const octokitMocks = vi.hoisted(() => {
  const createInOrg = vi.fn();
  const createForAuthenticatedUser = vi.fn();
  const get = vi.fn();
  const getAuthenticated = vi.fn();
  const getByUsername = vi.fn();
  const Octokit = vi.fn(() => ({
    rest: {
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
  }));

  return {
    createForAuthenticatedUser,
    createInOrg,
    get,
    getAuthenticated,
    getByUsername,
    Octokit,
  };
});

vi.mock("octokit", () => ({
  Octokit: octokitMocks.Octokit,
}));

import { ensureGitHubRepository } from "../octokit.ts";

describe("ensureGitHubRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns created false when the repository exists", async () => {
    octokitMocks.get.mockResolvedValue({ data: {} });

    const result = await ensureGitHubRepository("pagopa-dx", "terraform-aws-x");

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

    const result = await ensureGitHubRepository("pagopa-dx", "terraform-aws-x");

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

    const result = await ensureGitHubRepository(
      "pagopa-user",
      "terraform-aws-x",
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

    await expect(
      ensureGitHubRepository("pagopa-user", "terraform-aws-x"),
    ).rejects.toThrow(
      'Cannot create repository for user owner "pagopa-user" with authenticated user "another-user".',
    );

    expect(octokitMocks.getByUsername).toHaveBeenCalledWith({
      username: "pagopa-user",
    });
    expect(octokitMocks.createForAuthenticatedUser).not.toHaveBeenCalled();
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });
});
