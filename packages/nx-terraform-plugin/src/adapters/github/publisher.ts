// Orchestrates GitHub publishing with direct Octokit and git subprocess calls.

import { $ as $_ } from "execa";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import {
  createGitHubAppToken,
  ensureGitHubRepository,
  type GitHubAppCredentials,
  revokeGitHubAppToken,
} from "./octokit.ts";

export interface PublishToGithubInput {
  description: string;
  githubAppCredentials?: GitHubAppCredentials;
  githubOwner: string;
  githubToken: string;
  projectRoot: string;
  provider: string;
  version: string;
  workspaceRoot: string;
}

export type PublishToGithubResult = "published" | "skipped";

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

const clearExportWorkingTree = async (
  exportDirectory: string,
): Promise<void> => {
  const entries = await readdir(exportDirectory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.name !== ".git")
      .map((entry) =>
        rm(join(exportDirectory, entry.name), { force: true, recursive: true }),
      ),
  );
};

export const publishToGithub = async (
  input: PublishToGithubInput,
): Promise<PublishToGithubResult> => {
  const repo = getRepoNameFromProjectRoot(input.projectRoot, input.provider);
  const repoUrl = `https://github.com/${input.githubOwner}/${repo}.git`;
  const sourceModuleDirectory = join(input.workspaceRoot, input.projectRoot);
  const token =
    input.githubAppCredentials === undefined
      ? input.githubToken
      : await createGitHubAppToken(
          input.githubOwner,
          input.githubAppCredentials,
        );

  let publishError: unknown;
  let publishResult: PublishToGithubResult = "published";
  let tempExportDir: string | undefined;

  try {
    await ensureGitHubRepository(input.githubOwner, repo, token);
    tempExportDir = await mkdtemp(join(tmpdir(), "export-repo-"));

    await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);

    const $ = $_({
      cwd: tempExportDir,
      env: {
        GH_TOKEN: token,
        GIT_AUTHOR_EMAIL: "pagopa-dx-bot@pagopa.it",
        GIT_AUTHOR_NAME: "PagoPA DX Bot",
        GIT_COMMITTER_EMAIL: "pagopa-dx-bot@pagopa.it",
        GIT_COMMITTER_NAME: "PagoPA DX Bot",
      },
      shell: true,
    });
    const safe$ = $({ reject: false });

    await $`git init -b main`;

    // Subrepo git operations (ls-remote, fetch, push) run over HTTPS and need
    // credentials. Anonymous HTTPS can read a public repo, but `git push`
    // requires auth or git prompts for a username (fatal in CI). `gh auth
    // setup-git` installs a git credential helper that reads GH_TOKEN /
    // GITHUB_TOKEN and serves credentials for github.com HTTPS remotes, so the
    // token never lands in the remote URL, `.git/config`, or `git remote -v`
    // output, and every later git operation is covered without per-call wiring.
    await $`gh auth setup-git`;

    const remoteAdd = await safe$`git remote add origin ${repoUrl}`;
    if (remoteAdd.exitCode !== 0) {
      throw new Error(`Failed to add git remote origin for ${repoUrl}`);
    }

    const remoteTag =
      await safe$`git ls-remote --exit-code --tags origin refs/tags/${input.version}`;
    if (remoteTag.exitCode === 0) {
      publishResult = "skipped";
    } else if (remoteTag.exitCode !== 2) {
      throw new Error(
        `Failed to resolve remote tag ${input.version} for ${repoUrl}`,
      );
    } else {
      await clearExportWorkingTree(tempExportDir);

      const remoteMain =
        await safe$`git ls-remote --exit-code --heads origin main`;
      if (remoteMain.exitCode === 0) {
        await $`git fetch origin main`;
        await $`git checkout -B main origin/main`;
      } else if (remoteMain.exitCode !== 2) {
        throw new Error(`Failed to resolve remote main for ${repoUrl}`);
      }

      await clearExportWorkingTree(tempExportDir);
      await copyModuleDirectoryContents(sourceModuleDirectory, tempExportDir);
      await $`git add --all`;

      // The subrepo's main branch may already match the module's current
      // contents (e.g. a concurrent legacy sync pushed the same tree first).
      // In that case there's nothing to commit, but we must still tag and
      // push so the release completes instead of failing.
      //
      // `shell: true` makes execa join argv into a single string that the
      // shell re-parses, so an interpolated value must be quoted here or it
      // gets word-split on whitespace (e.g. "Release 1.2.3" -> two args).
      const commitResult =
        await safe$`git commit -m "Release ${input.version}"`;
      if (commitResult.exitCode !== 0) {
        const commitOutput = `${commitResult.stdout}${commitResult.stderr}`;
        if (!commitOutput.includes("nothing to commit")) {
          throw new Error(
            `Failed to commit release ${input.version} for ${repoUrl}: ${commitOutput}`,
          );
        }
      }

      await $`git tag -f ${input.version}`;
      await $`git push origin main`;
      await $`git push origin refs/tags/${input.version} --force`;
    }
  } catch (error) {
    publishError = error;
  }

  let cleanupError: unknown;
  if (tempExportDir !== undefined) {
    try {
      await rm(tempExportDir, { force: true, recursive: true });
    } catch (error) {
      const cleanupMessage = `Failed to remove temporary export directory ${tempExportDir}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      cleanupError = new Error(cleanupMessage, {
        cause: error,
      });
    }
  }

  let revokeError: unknown;
  if (input.githubAppCredentials !== undefined) {
    try {
      // Installation tokens are temporary, but revoking them minimizes their
      // usable lifetime even when publishing failed or was skipped.
      await revokeGitHubAppToken(token);
    } catch (error) {
      revokeError = error;
    }
  }

  // Cleanup must not hide the error that caused publishing to fail.
  const finalError = publishError ?? cleanupError ?? revokeError;
  if (finalError !== undefined) {
    throw finalError;
  }

  return publishResult;
};
