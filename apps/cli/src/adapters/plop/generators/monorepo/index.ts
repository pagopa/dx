import { type NodePlopAPI } from "node-plop";
import { Octokit } from "octokit";

import setFetchGitHubRelease, {
  type FetchGitHubReleaseFn,
  makeFetchGitHubRelease,
} from "../../actions/fetch-github-release.js";
import setGetNodeVersionAction, {
  defaultFetchNodeVersion,
} from "../../actions/get-node-version.js";
import { type FetchSemverFn } from "../../actions/semver.js";
import setSetupPnpmAction, {
  setupPnpm,
  type SetupPnpmAction,
} from "../../actions/setup-pnpm.js";
import getActions from "./actions.js";
import getPrompts, { Payload, payloadSchema } from "./prompts.js";

export const PLOP_MONOREPO_GENERATOR_NAME = "DX_Monorepo";
export { Payload, payloadSchema };

export type MonorepoGeneratorDependencies = {
  fetchGitHubRelease?: FetchGitHubReleaseFn;
  fetchNodeVersion?: FetchSemverFn;
  setupPnpm?: SetupPnpmAction;
};

export default function (
  plop: NodePlopAPI,
  templatesPath: string,
  octokit: Octokit,
  deps: MonorepoGeneratorDependencies = {},
) {
  setSetupPnpmAction(plop, deps.setupPnpm ?? setupPnpm);
  setGetNodeVersionAction(
    plop,
    deps.fetchNodeVersion ?? defaultFetchNodeVersion,
  );
  setFetchGitHubRelease(
    plop,
    deps.fetchGitHubRelease ?? makeFetchGitHubRelease(octokit),
  );
  plop.setGenerator(PLOP_MONOREPO_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "A scaffold for a monorepo repository",
    prompts: getPrompts(),
  });
}
