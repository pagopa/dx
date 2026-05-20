import { type NodePlopAPI } from "node-plop";

import setFetchGitHubRelease from "../../actions/fetch-github-release.js";
import setGetNodeVersionAction from "../../actions/get-node-version.js";
import setSetupPnpmAction from "../../actions/setup-pnpm.js";
import { type ReleaseClient } from "../../dependencies.js";
import getActions from "./actions.js";
import getPrompts, { Payload, payloadSchema } from "./prompts.js";

export const PLOP_MONOREPO_GENERATOR_NAME = "DX_Monorepo";
export { Payload, payloadSchema };

export default function (
  plop: NodePlopAPI,
  templatesPath: string,
  releaseClient: ReleaseClient,
) {
  setSetupPnpmAction(plop);
  setGetNodeVersionAction(plop);
  setFetchGitHubRelease(plop, releaseClient);
  plop.setGenerator(PLOP_MONOREPO_GENERATOR_NAME, {
    actions: getActions(templatesPath),
    description: "A scaffold for a monorepo repository",
    prompts: getPrompts(),
  });
}
