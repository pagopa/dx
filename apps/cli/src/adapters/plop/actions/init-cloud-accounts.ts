import { type NodePlopAPI } from "node-plop";
import assert from "node:assert/strict";

import { CloudAccountService } from "../../../domain/cloud-account.js";
import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

export const initCloudAccounts = async (
  payload: Payload,
  cloudAccountService: CloudAccountService,
) => {
  if (payload.init && payload.init.cloudAccountsToInitialize.length > 0) {
    const { runnerAppCredentials } = payload.init;
    assert.ok(runnerAppCredentials, "Runner app credentials are required");
    await Promise.all(
      payload.init.cloudAccountsToInitialize.map((cloudAccount) =>
        cloudAccountService.initialize(
          cloudAccount,
          payload.env,
          runnerAppCredentials,
          payload.tags,
        ),
      ),
    );
  }
};

export default function (
  plop: NodePlopAPI,
  cloudAccountService: CloudAccountService,
) {
  plop.setActionType("initCloudAccounts", async (data) => {
    const payload = payloadSchema.parse(data);
    await initCloudAccounts(payload, cloudAccountService);
    return "Cloud Accounts Initialized";
  });
}
