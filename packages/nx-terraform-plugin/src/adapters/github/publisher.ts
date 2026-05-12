// Orchestrates GitHub publishing with direct Octokit and git subprocess calls.

import { $ as $_, execa } from "execa";

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
  const remoteMainBranch = await execa(
    "git",
    ["ls-remote", "--exit-code", "--heads", remote, "refs/heads/main"],
    {
      cwd: input.workspaceRoot,
      reject: false,
    },
  );

  if (remoteMainBranch.exitCode === 0) {
    await $`git fetch ${remote} main --tags`;
    await $`git checkout ${branch}`;
    await $`git merge --allow-unrelated-histories -s ours --no-edit ${remote}/main`;
  } else if (remoteMainBranch.exitCode !== 2) {
    throw new Error(
      `Failed to check whether ${remote}/main exists (exit code ${remoteMainBranch.exitCode})${
        remoteMainBranch.stderr === "" ? "" : `: ${remoteMainBranch.stderr}`
      }`,
    );
  }

  await $`git push ${remote} ${branch}:main`;
};
