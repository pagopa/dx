import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => ({
  $: vi.fn(),
}));

import { $ } from "execa";

import { getGitHubRepoName } from "../get-github-repo-name.js";

const mock$ = $ as unknown as ReturnType<typeof vi.fn>;

describe("getGitHubRepoName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse GitHub repository URL and return owner and repo", async () => {
    mock$.mockResolvedValue({ stdout: "https://github.com/pagopa/dx" });

    const result = await getGitHubRepoName();

    expect(result).toEqual({
      owner: "pagopa",
      repo: "dx",
    });
  });

  it("should handle repository URLs with .git suffix", async () => {
    mock$.mockResolvedValue({ stdout: "https://github.com/pagopa/dx.git" });

    const result = await getGitHubRepoName();

    expect(result).toEqual({
      owner: "pagopa",
      repo: "dx",
    });
  });

  it("should throw an error for non-GitHub repositories", async () => {
    mock$.mockResolvedValue({ stdout: "https://gitlab.com/owner/repo" });

    await expect(getGitHubRepoName()).rejects.toThrow(
      "Only GitHub repositories are supported",
    );
  });

  it("should throw an error for Bitbucket repositories", async () => {
    mock$.mockResolvedValue({ stdout: "https://bitbucket.org/owner/repo" });

    await expect(getGitHubRepoName()).rejects.toThrow(
      "Only GitHub repositories are supported",
    );
  });

  it("should handle repository names with hyphens", async () => {
    mock$.mockResolvedValue({
      stdout: "https://github.com/my-org/my-repo-name",
    });

    const result = await getGitHubRepoName();

    expect(result).toEqual({
      owner: "my-org",
      repo: "my-repo-name",
    });
  });

  it("should handle repository names with underscores", async () => {
    mock$.mockResolvedValue({
      stdout: "https://github.com/my_org/my_repo_name",
    });

    const result = await getGitHubRepoName();

    expect(result).toEqual({
      owner: "my_org",
      repo: "my_repo_name",
    });
  });
});
