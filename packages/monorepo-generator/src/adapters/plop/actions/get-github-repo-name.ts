import { $ } from "execa";
import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import { githubRepoSchema } from "../../../domain/github-repo.js";

export const getGitHubRepoName = async () => {
  const result = await $`git config --get remote.origin.url`;
  const repoUrl = result.stdout.trim();

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

export default function (plop: NodePlopAPI) {
  plop.setActionType("getGitHubRepoName", async (data) => {
    data.github = await getGitHubRepoName();
    return "GitHub Repository Retrieved";
  });
}
