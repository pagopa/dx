import { beforeEach, describe, expect, it, vi } from "vitest";

const execaMocks = vi.hoisted(() => ({
  $: vi.fn(),
}));

vi.mock("execa", () => ({
  $: execaMocks.$,
}));

import { getGithubRepo } from "../github-repo.js";

type GitConfigResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

const mockGitRemoteOriginUrl = (result: GitConfigResult) => {
  const command$ = vi.fn().mockResolvedValue(result);

  execaMocks.$.mockImplementation(
    (firstArg: TemplateStringsArray | { reject: boolean }) => {
      if (!("raw" in firstArg)) {
        return command$;
      }

      if (result.exitCode === 0) {
        return Promise.resolve(result);
      }

      return Promise.reject(
        new Error(`Command failed with exit code ${result.exitCode}`),
      );
    },
  );

  return result;
};

describe("getGithubRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined if no remote URL is set", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "",
    });

    const result = await getGithubRepo();

    expect(result).toBeUndefined();
  });

  it("should return undefined if git reports that remote origin is missing", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 1,
      stderr: "",
      stdout: "",
    });

    const result = await getGithubRepo();

    expect(result).toBeUndefined();
  });

  it("should throw an error with cause if reading the remote fails", async () => {
    const gitFailure = mockGitRemoteOriginUrl({
      exitCode: 128,
      stderr: "fatal: not in a git directory",
      stdout: "",
    });
    const result = getGithubRepo();

    await expect(result).rejects.toThrow("fatal: not in a git directory");
    await expect(result).rejects.toHaveProperty("cause", gitFailure);
  });

  it("should surface the real cause when exit 1 also reports an error", async () => {
    const gitFailure = mockGitRemoteOriginUrl({
      exitCode: 1,
      stderr: "error: cannot read config file",
      stdout: "",
    });
    const result = getGithubRepo();

    await expect(result).rejects.toThrow("error: cannot read config file");
    await expect(result).rejects.toHaveProperty("cause", gitFailure);
  });

  it("should parse GitHub repository URL and return owner and repo", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "https://github.com/pagopa/dx",
    });

    const result = await getGithubRepo();

    expect(result).toEqual({
      owner: "pagopa",
      repo: "dx",
    });
  });

  it("should handle repository URLs with .git suffix", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "https://github.com/pagopa/dx.git",
    });

    const result = await getGithubRepo();

    expect(result).toEqual({
      owner: "pagopa",
      repo: "dx",
    });
  });

  it("should throw an error for non-GitHub repositories", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "https://gitlab.com/owner/repo",
    });

    await expect(getGithubRepo()).rejects.toThrow(
      "Only GitHub repositories are supported",
    );
  });

  it("should handle repository names with hyphens", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "https://github.com/my-org/my-repo-name",
    });

    const result = await getGithubRepo();

    expect(result).toEqual({
      owner: "my-org",
      repo: "my-repo-name",
    });
  });

  it("should handle repository names with underscores", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "https://github.com/my_org/my_repo_name",
    });

    const result = await getGithubRepo();

    expect(result).toEqual({
      owner: "my_org",
      repo: "my_repo_name",
    });
  });

  it("should handle ssh repository URLs", async () => {
    mockGitRemoteOriginUrl({
      exitCode: 0,
      stderr: "",
      stdout: "git@github.com:my-org/my-repo-name.git",
    });

    const result = await getGithubRepo();

    expect(result).toEqual({
      owner: "my-org",
      repo: "my-repo-name",
    });
  });
});
