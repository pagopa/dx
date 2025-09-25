import type { ActionType } from "plop";

import { Octokit } from "octokit";

import { fetchLatestRelease } from "../adapters/octokit/index.js";
import { fetchLatestSemver } from "./semver.js";

interface NodeActionsDependencies {
  octokitClient: Octokit;
}

export const getLatestNodeVersion =
  ({ octokitClient }: NodeActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "nodejs";
    const repo = "node";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "nodeVersion",
    );
  };
