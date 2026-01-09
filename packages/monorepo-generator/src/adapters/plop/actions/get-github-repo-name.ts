import { $ } from "execa";
import { type NodePlopAPI } from "node-plop";
import * as assert from "node:assert/strict";

import { githubRepoSchema } from "../../../domain/github-repo.js";

export const getGitHubRepoName = async () => {
  const result = await $`git config --get remote.origin.url`;

  const url = new URL(result.stdout);
  assert.equal(
    url.origin,
    "https://github.com",
    "Only GitHub repositories are supported",
  );
  const [, owner, repo] = url.pathname.split("/");
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
