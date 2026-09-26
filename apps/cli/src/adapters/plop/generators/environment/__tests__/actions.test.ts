import { type ActionConfig } from "node-plop";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { CloudAccount } from "../../../../../domain/cloud-account.js";
import getActions from "../actions.js";
import { Payload } from "../prompts.js";

const loggerMocks = vi.hoisted(() => ({
  debug: vi.fn(),
}));

vi.mock("@logtape/logtape", () => ({
  getLogger: vi.fn(() => loggerMocks),
}));

const terraformBackendActionSchema = z.object({
  data: z.object({
    terraformBackendKey: z.string(),
  }),
  type: z.literal("addMany"),
});

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
      runnerAppCredentials: {
        clientId: "test-app-client-id",
        id: "test-app-id",
        installationId: "test-installation-id",
        key: "test-private-key",
      },
      terraformBackend: {
        cloudAccount,
      },
    };
  }

  return payload;
};

describe("actions", () => {
  beforeEach(() => {
    loggerMocks.debug.mockClear();
  });

  test("does not log Runner App private keys", () => {
    const payload = getPayload(true);
    payload.runnerAppCredentials = {
      clientId: "top-level-client-id",
      id: "top-level-app-id",
      installationId: "top-level-installation-id",
      key: "top-level-private-key",
    };

    getActions("/templates/path")(payload);

    const loggedCalls = JSON.stringify(loggerMocks.debug.mock.calls);
    expect(loggedCalls).not.toContain("test-private-key");
    expect(loggedCalls).not.toContain("top-level-private-key");
  });

  test.each([
    {
      payload: getPayload(true),
    },
    {
      payload: getPayload(false),
    },
  ])("correct order of actions", ({ payload }) => {
    const actionsOrder = [
      "getTerraformBackend",
      "syncRepositoryEnvironments",
      "configureGitHubEnvironments",
      "addMany",
      "addMany",
      "addMany",
    ];

    if (payload.init) {
      actionsOrder.unshift(
        "setupCloudTools",
        "initCloudAccounts",
        "provisionTerraformBackend",
      );
      actionsOrder.push("addMany", "addMany");
    } else {
      actionsOrder.unshift("setupCloudTools");
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

  test.each([
    {
      expectedKeys: ["mytest/bootstrapper.tfstate", "core.tfstate"],
      payload: getPayload(true),
    },
    {
      expectedKeys: ["mytest/bootstrapper.tfstate"],
      payload: getPayload(false),
    },
  ])(
    "uses prefix/domain/scope state keys in shared backend actions",
    ({ expectedKeys, payload }) => {
      const actions = getActions("/templates/path")(payload);

      const terraformBackendKeys = actions
        .filter(
          (
            action,
          ): action is ActionConfig & {
            data: { terraformBackendKey: string };
          } => terraformBackendActionSchema.safeParse(action).success,
        )
        .map((action) => action.data.terraformBackendKey);

      expect(terraformBackendKeys).toEqual(expectedKeys);
    },
  );
});
