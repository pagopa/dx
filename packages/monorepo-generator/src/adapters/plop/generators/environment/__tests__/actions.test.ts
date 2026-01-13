import { type ActionConfig } from "node-plop";
import { describe, expect, test } from "vitest";

import { CloudAccount } from "../../../../../domain/cloud-account.js";
import getActions from "../actions.js";
import { Payload } from "../prompts.js";

export const getPayload = (includeInit = false): Payload => {
  const cloudAccount: CloudAccount = {
    csp: "azure",
    defaultLocation: "westeurope",
    displayName: "Test-Account",
    id: "test-subscription-id",
  };

  const payload: Payload = {
    env: {
      cloudAccounts: [cloudAccount],
      name: "dev",
      prefix: "dx",
    },
    github: {
      owner: "pagopa",
      repo: "dx",
    },
    tags: {},
    workspace: {
      domain: "mytest",
    },
  };

  if (includeInit) {
    payload.init = {
      cloudAccountsToInitialize: [cloudAccount],
      terraformBackend: {
        cloudAccount,
      },
    };
  }

  return payload;
};

describe("actions", () => {
  test.each([
    {
      payload: getPayload(true),
    },
    {
      payload: getPayload(false),
    },
  ])("correct order of actions", ({ payload }) => {
    const actionsOrder = ["getTerraformBackend", "addMany", "addMany"];

    if (payload.init) {
      actionsOrder.unshift("initCloudAccounts", "provisionTerraformBackend");
      actionsOrder.push("addMany", "addMany");
    }

    const actions = getActions("/templates/path")(payload);

    const actionTypes = actions
      .filter(
        (action): action is ActionConfig =>
          typeof action === "object" && Object.hasOwn(action, "type"),
      )
      .map((action) => action.type);

    expect(actionTypes).toEqual(actionsOrder);
  });
});
