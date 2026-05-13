// Orchestrates GitHub publishing with direct Octokit and git subprocess calls.

import { $ as $_ } from "execa";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

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
  // Replace backslashes with forward slashes for cross-platform compatibility
  const normalizedPath = projectRoot.replace(/\\/g, "/");
  const moduleName = basename(normalizedPath).replaceAll("_", "-");
  return `terraform-${provider}-${moduleName}`;
};

const copyModuleDirectoryContents = async (
  sourceDirectory: string,
  targetDirectory: string,
): Promise<void> => {
  await cp(sourceDirectory, targetDirectory, {
    filter: (source) => {
      // Replace backslashes with forward slashes for cross-platform compatibility
      const normalizedPath = source.replace(/\\/g, "/");
      const parts = normalizedPath.split("/");
      return !parts.includes(".git");
    },
    recursive: true,
  });
};

export const publishToGithub = async (
  input: PublishToGithubInput,
): Promise<void> => {
  const repo = getRepoNameFromProjectRoot(input.projectRoot, input.provider);
  const repoUrl = `https://github.com/${input.githubOwner}/${repo}.git`;
  const sourceModuleDirectory = join(input.workspaceRoot, input.projectRoot);

  await ensureGitHubRepository(input.githubOwner, repo);

  let publishError: unknown;
  let tempExportDir: string | undefined;

  try {
    tempExportDir = await mkdtemp(join(tmpdir(), "export-repo-"));

    await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);

    const $ = $_({
      cwd: tempExportDir,
      env: {
        GIT_AUTHOR_EMAIL: "pagopa-dx-bot@pagopa.it",
        GIT_AUTHOR_NAME: "PagoPA DX Bot",
        GIT_COMMITTER_EMAIL: "pagopa-dx-bot@pagopa.it",
        GIT_COMMITTER_NAME: "PagoPA DX Bot",
      },
      shell: true,
    });

    await $`git init -b main`;
    await $`git add .`;
    await $`git commit -m "Updated module"`;
    await $`git remote add origin ${repoUrl}`;
    await $`git tag ${input.version}`;
    await $`git push origin HEAD:main --force`;
    await $`git push origin refs/tags/${input.version} --force`;
  } catch (error) {
    publishError = error;
  }

  if (tempExportDir !== undefined) {
    try {
      await rm(tempExportDir, { force: true, recursive: true });
    } catch (cleanupError) {
      if (publishError !== undefined) {
        throw publishError;
      }
      const cleanupMessage = `Failed to remove temporary export directory ${tempExportDir}: ${
        cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError)
      }`;
      throw new Error(cleanupMessage, {
        cause: cleanupError,
      });
    }
  }

  if (publishError !== undefined) {
    throw publishError;
  }
};
