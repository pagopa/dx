/**
 * Real workspace effects implementation.
 *
 * Extracts the repository-creation, git-push, and pull-request logic that
 * previously lived inline in the init command. Delegates to terraform, git CLI,
 * and the injected GitHubService.
 */

import { getLogger } from "@logtape/logtape";
import { $, ExecaError } from "execa";
import { okAsync, ResultAsync } from "neverthrow";
import * as path from "node:path";
import { oraPromise } from "ora";

import { GitHubService, PullRequest, Repository } from "../../domain/github.js";
import {
  type RepositoryPullRequest,
  type WorkspaceEffects,
} from "../../domain/workspace-effects.js";
import { tf$ } from "../execa/terraform.js";
import { type Payload as MonorepoPayload } from "../plop/generators/monorepo/index.js";

type LocalWorkspace = {
  branchName: string;
  repository: Repository;
};

const withSpinner = <T>(
  text: string,
  successText: ((value: T) => string) | string,
  failText: string,
  promise: Promise<T>,
): ResultAsync<T, Error> =>
  ResultAsync.fromPromise(
    oraPromise(promise, {
      failText,
      successText,
      text,
    }),
    (cause) => new Error(failText, { cause }),
  );

const createRemoteRepository = ({
  repoName,
  repoOwner,
}: MonorepoPayload): ResultAsync<Repository, Error> => {
  const logger = getLogger(["dx-cli", "init"]);
  const repo$ = tf$({ cwd: path.resolve("infra", "repository") });
  const applyTerraform = async () => {
    try {
      await repo$`terraform init`;
      await repo$`terraform apply -auto-approve`;
    } catch (error) {
      if (error instanceof ExecaError) {
        logger.error(error.shortMessage);
      }
      throw error;
    }
  };
  return withSpinner(
    "Creating GitHub repository...",
    "GitHub repository created successfully!",
    "Failed to create GitHub repository.",
    applyTerraform(),
  ).map(() => new Repository(repoName, repoOwner));
};

const initializeGitRepository = (
  repository: Repository,
): ResultAsync<LocalWorkspace, Error> => {
  const branchName = "features/scaffold-workspace";
  const git$ = $({
    shell: true,
  });
  const pushToOrigin = async () => {
    await git$`git init`;
    await git$`git remote add origin ${repository.origin}`;
    await git$`git fetch origin main`;
    await git$`git checkout -b ${branchName}`;
    await git$`git reset origin/main`;
    await git$`git add .`;
    await git$`git commit --no-gpg-sign -m "Scaffold workspace"`;
    await git$`git push -u origin ${branchName}`;
  };
  return withSpinner(
    "Pushing code to GitHub...",
    "Code pushed to GitHub successfully!",
    "Failed to push code to GitHub.",
    pushToOrigin(),
  ).map(() => ({ branchName, repository }));
};

const createPullRequest =
  (githubService: GitHubService) =>
  ({
    branchName,
    repository,
  }: LocalWorkspace): ResultAsync<PullRequest | undefined, Error> =>
    withSpinner(
      "Creating Pull Request...",
      "Pull Request created successfully!",
      "Failed to create Pull Request.",
      githubService.createPullRequest({
        base: "main",
        body: "This PR contains the scaffolded monorepo structure.",
        head: branchName,
        owner: repository.owner,
        repo: repository.name,
        title: "Scaffold repository",
      }),
    ).orElse(() => okAsync(undefined));

export const makeRealWorkspaceEffects = (
  githubService: GitHubService,
): WorkspaceEffects => ({
  publishRepository(
    payload: MonorepoPayload,
  ): ResultAsync<RepositoryPullRequest, Error> {
    return createRemoteRepository(payload)
      .andThen(initializeGitRepository)
      .andThen((localWorkspace) =>
        createPullRequest(githubService)(localWorkspace).map((pr) => ({
          pr,
          repository: localWorkspace.repository,
        })),
      );
  },
});
