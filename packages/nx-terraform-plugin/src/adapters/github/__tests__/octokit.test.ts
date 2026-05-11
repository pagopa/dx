import { beforeEach, describe, expect, it, vi } from "vitest";

const octokitMocks = vi.hoisted(() => {
  const createInOrg = vi.fn();
  const get = vi.fn();
  const Octokit = vi.fn(() => ({
    rest: {
      repos: {
        createInOrg,
        get,
      },
    },
  }));

  return {
    createInOrg,
    get,
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
    expect(octokitMocks.createInOrg).not.toHaveBeenCalled();
  });

  it("creates the repository when octokit reports a 404", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    octokitMocks.get.mockRejectedValueOnce(notFoundError);
    octokitMocks.createInOrg.mockResolvedValue({ data: {} });

    const result = await ensureGitHubRepository("pagopa-dx", "terraform-aws-x");

    expect(result).toBeUndefined();
    expect(octokitMocks.createInOrg).toHaveBeenCalledWith({
      name: "terraform-aws-x",
      org: "pagopa-dx",
      visibility: "public",
    });
  });
});
