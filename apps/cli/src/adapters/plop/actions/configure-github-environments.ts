import { type NodePlopAPI } from "node-plop";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import { type GitHubService } from "../../../domain/github.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

export const configureGitHubEnvironments = async (
  payload: Payload,
  cloudAccountService: CloudAccountService,
  gitHubService: GitHubService,
) => {
  const runnerAppCredentials = payload.init?.runnerAppCredentials;

  await Promise.all(
    payload.env.cloudAccounts.map((cloudAccount) =>
      cloudAccountService.configureGitHubEnvironment(
        cloudAccount,
        payload.env,
        payload.github,
        gitHubService,
        runnerAppCredentials,
      ),
    ),
  );
};

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
  gitHubService: GitHubService,
) {
  plop.setActionType("configureGitHubEnvironments", async (data) => {
    const payload = payloadSchema.parse(data);
    await configureGitHubEnvironments(
      payload,
      cloudAccountService,
      gitHubService,
    );
    return "GitHub environments configured";
  });
}
