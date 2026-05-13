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
  const safe$ = $({
    reject: false,
  });
  const repo = getRepoNameFromProjectRoot(input.projectRoot, input.provider);
  const moduleDirectory = input.projectRoot.split("/").pop() ?? "";
  const branch = `${moduleDirectory}-branch`;
  const remote = `${input.githubOwner}-${repo}`;
  const repoUrl = `https://github.com/${input.githubOwner}/${repo}.git`;

  await ensureGitHubRepository(input.githubOwner, repo);

  let publishError: unknown;
  const cleanupFailures: string[] = [];

  const recordCleanupFailure = (
    artifactType: string,
    artifactName: string,
    exitCode: number,
    stderr: string,
  ) => {
    cleanupFailures.push(
      `Failed to remove temporary ${artifactType} ${artifactName} (exit code ${exitCode})${
        stderr === "" ? "" : `: ${stderr}`
      }`,
    );
  };

  const runCleanupCommand = async (
    artifactType: string,
    artifactName: string,
    command: () => Promise<{ exitCode?: number; stderr: string }>,
  ) => {
    try {
      const result = await command();
      const exitCode = result.exitCode ?? 1;
      if (exitCode !== 0) {
        recordCleanupFailure(
          artifactType,
          artifactName,
          exitCode,
          result.stderr,
        );
      }
    } catch (error) {
      cleanupFailures.push(
        `Failed to remove temporary ${artifactType} ${artifactName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  try {
    await $`git remote add ${remote} ${repoUrl}`;
    await $`git subtree split --prefix=${input.projectRoot} -b ${branch}`;
    const remoteMainBranch =
      await safe$`git ls-remote --exit-code --heads ${remote} refs/heads/main`;

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
  } catch (error) {
    publishError = error;
  }

  await runCleanupCommand(
    "remote",
    remote,
    () => safe$`git remote remove ${remote}`,
  );
  await runCleanupCommand(
    "branch",
    branch,
    () => safe$`git branch -D ${branch}`,
  );

  if (publishError !== undefined) {
    throw publishError;
  }

  if (cleanupFailures.length > 0) {
    throw new Error(cleanupFailures.join("\n"));
  }
};
