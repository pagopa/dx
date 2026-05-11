// Orchestrates GitHub publishing with direct Octokit and git subprocess calls.

import { $ as $_ } from "execa";

import { ensureGitHubRepository } from "./octokit.ts";

export interface PublishToGithubInput {
  description: string;
  githubOwner: string;
  projectRoot: string;
  provider: string;
  version: string;
  workspaceRoot: string;
}

export const getRepoNameFromProjectRoot = (
  projectRoot: string,
  provider: string,
) => {
  const moduleName = projectRoot.split("/").pop()?.replaceAll("_", "-") ?? "";
  return `terraform-${provider}-${moduleName}`;
};

export const publishToGithub = async (
  input: PublishToGithubInput,
): Promise<void> => {
  const $ = $_({
    cwd: input.workspaceRoot,
  });
  const repo = getRepoNameFromProjectRoot(input.projectRoot, input.provider);
  const moduleDirectory = input.projectRoot.split("/").pop() ?? "";
  const branch = `${moduleDirectory}-branch`;
  const remote = `${input.githubOwner}-${repo}`;
  const repoUrl = `https://github.com/${input.githubOwner}/${repo}.git`;

  await ensureGitHubRepository(input.githubOwner, repo);

  await $`git remote add ${remote} ${repoUrl}`;
  await $`git subtree split --prefix=${input.projectRoot} -b ${branch}`;
  await $`git fetch ${remote} main --tags`;
  await $`git merge --allow-unrelated-histories -s ours --no-edit ${branch}`;
  await $`git push ${remote} ${branch}:main`;
};
