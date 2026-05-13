import { type NodePlopAPI } from "node-plop";
import { Octokit } from "octokit";
import { z } from "zod/v4";

import { fetchLatestRelease } from "../../octokit/index.js";
import { fetchLatestSemver, FetchSemverFn } from "./semver.js";

export const semverFetchOptionsSchema = z.object({
  repository: z.object({
    name: z.string(),
    owner: z.string(),
  }),
  resultKey: z.string(),
});

export type FetchGitHubReleaseFn = (
  repository: SemverFetchOptions["repository"],
) => FetchSemverFn;

export type SemverFetchOptions = z.infer<typeof semverFetchOptionsSchema>;

export const makeFetchGitHubRelease =
  (octokit: Octokit): FetchGitHubReleaseFn =>
  (repository) =>
  () =>
    fetchLatestRelease({
      client: octokit,
      owner: repository.owner,
      repo: repository.name,
    });

export default function (
  plop: NodePlopAPI,
  fetchGitHubRelease: FetchGitHubReleaseFn,
) {
  plop.setActionType("fetchGithubRelease", async (data, ctx) => {
    const { repository, resultKey } = semverFetchOptionsSchema.parse(ctx);
    return fetchLatestSemver(fetchGitHubRelease(repository), data, resultKey);
  });
}
