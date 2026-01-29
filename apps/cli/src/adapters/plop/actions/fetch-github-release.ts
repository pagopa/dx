import { type NodePlopAPI } from "node-plop";
import { Octokit } from "octokit";
import { z } from "zod/v4";

import { fetchLatestRelease } from "../../octokit/index.js";
import { fetchLatestSemver } from "./semver.js";

export const semverFetchOptionsSchema = z.object({
  repository: z.object({
    name: z.string(),
    owner: z.string(),
  }),
  resultKey: z.string(),
});

export type SemverFetchOptions = z.infer<typeof semverFetchOptionsSchema>;

export default function (plop: NodePlopAPI, octokit: Octokit) {
  plop.setActionType("fetchGithubRelease", async (data, ctx) => {
    const { repository, resultKey } = semverFetchOptionsSchema.parse(ctx);
    return fetchLatestSemver(
      () =>
        fetchLatestRelease({
          client: octokit,
          owner: repository.owner,
          repo: repository.name,
        }),
      data,
      resultKey,
    );
  });
}
