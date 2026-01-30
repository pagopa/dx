import { type NodePlopAPI } from "node-plop";
import { Octokit } from "octokit";

import setFetchGitHubRelease from "../../actions/fetch-github-release.js";
import setGetNodeVersionAction from "../../actions/get-node-version.js";
import setSetupPnpmAction from "../../actions/setup-pnpm.js";
import getActions from "./actions.js";
import getPrompts, { Payload, payloadSchema } from "./prompts.js";

export const PLOP_MONOREPO_GENERATOR_NAME = "DX_Monorepo";
export { Payload, payloadSchema };

export default function (
  plop: NodePlopAPI,
  templatesPath: string,
  octokit: Octokit,
) {
  setSetupPnpmAction(plop);
  setGetNodeVersionAction(plop);
  setFetchGitHubRelease(plop, octokit);
  plop.setGenerator(PLOP_MONOREPO_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "A scaffold for a monorepo repository",
    prompts: getPrompts(),
  });
}
