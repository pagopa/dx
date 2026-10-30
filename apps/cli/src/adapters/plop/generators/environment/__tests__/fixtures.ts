/**
 * Typed environment payloads shared by generator and placement contracts.
 */
import type { Payload } from "../prompts.js";

export const getPayload = (includeInit = false): Payload => {
  const cloudAccount = {
    csp: "azure" as const,
    defaultLocation: "westeurope",
    displayName: "Test-Account",
    id: "test-subscription-id",
  };
  const payload: Payload = {
    env: { cloudAccounts: [cloudAccount], name: "dev", prefix: "dx" },
    github: { owner: "pagopa", repo: "dx" },
    tags: { CostCenter: "TS000 - TECNOLOGIA & SERVIZI", Owner: "DX Platform" },
    workspace: { domain: "mytest" },
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
      terraformBackend: { cloudAccount },
    };
  }
  return payload;
};
