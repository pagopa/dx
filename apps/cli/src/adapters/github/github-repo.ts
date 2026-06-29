import { $ } from "execa";
import * as assert from "node:assert/strict";

import { githubRepoSchema } from "../../domain/github-repo.js";
import { GitHubRepo } from "../../domain/github-repo.js";

export const getGithubRepo = async (): Promise<GitHubRepo | undefined> => {
  const result = await readGitRemoteOriginUrl();
  const repoUrl = result.stdout.trim();
  const stderr = (result.stderr ?? "").trim();

  // `git config --get` exits 1 with no output when the key is unset: there is
  // simply no origin remote, which is a valid "not in a repo we manage" state.
  if (result.exitCode === 1 && repoUrl === "" && stderr === "") {
    return undefined;
  }

  if (result.exitCode !== 0) {
    throw new Error(
      stderr === "" ? "Failed to read git remote origin URL" : stderr,
      { cause: result },
    );
  }

  if (repoUrl === "") {
    return undefined;
  }

  let owner: string;
  let repo: string;

  // Handle SSH URLs (git@github.com:owner/repo.git)
  if (repoUrl.startsWith("git@github.com:")) {
    const sshPattern = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/;
    const match = repoUrl.match(sshPattern);
    assert.ok(match, "Invalid GitHub SSH URL format");
    [, owner, repo] = match;
  } else {
    // Handle HTTPS URLs (https://github.com/owner/repo.git)
    const url = new URL(repoUrl);
    assert.equal(
      url.origin,
      "https://github.com",
      "Only GitHub repositories are supported",
    );
    const [, urlOwner, urlRepo] = url.pathname.split("/");
    owner = urlOwner;
    repo = urlRepo.replace(/\.git$/, "");
  }

  return githubRepoSchema.parse({
    owner,
    repo,
  });
};

const readGitRemoteOriginUrl = async () => {
  try {
    return await $({ reject: false })`git config --get remote.origin.url`;
  } catch (error) {
    throw new Error("Failed to read git remote origin URL", { cause: error });
  }
};
