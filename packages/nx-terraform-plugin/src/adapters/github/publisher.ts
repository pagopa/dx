// Orchestrates GitHub publishing with direct Octokit and git subprocess calls.

import { $ as $_ } from "execa";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { ensureGitHubRepository, getGitHubToken } from "./octokit.ts";

export interface PublishToGithubInput {
  description: string;
  githubOwner: string;
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

  await ensureGitHubRepository(input.githubOwner, repo);

  let publishError: unknown;
  let publishResult: PublishToGithubResult = "published";
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
    const safe$ = $({ reject: false });

    await $`git init -b main`;

    // Reads/writes to the subrepo need credentials. Anonymous HTTPS can read a
    // public repo, but `git push` requires auth or git prompts for a username
    // (fatal in CI). Embed the GitHub App installation token as the
    // `x-access-token` user in the remote URL when available. Derive from
    // `repoUrl` (rather than rebuilding the host/path by hand) so the two
    // can't drift, and so the `URL` API percent-encodes the credentials.
    // Keep `repoUrl` itself (token-free) for logs and error messages so the
    // token never leaks, and use `safe$` for the remote add so a failure
    // can't echo the token URL.
    const token = getGitHubToken();
    let authenticatedRepoUrl = repoUrl;
    if (token !== undefined) {
      const url = new URL(repoUrl);
      url.username = "x-access-token";
      url.password = token;
      authenticatedRepoUrl = url.toString();
    }
    const remoteAdd =
      await safe$`git remote add origin ${authenticatedRepoUrl}`;
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

  return publishResult;
};
