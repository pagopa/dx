/**
 * Sandbox state model.
 *
 * Represents the local, in-memory state that replaces real remote services
 * (GitHub, Azure) during dry-run and test executions. Tracks all operations
 * that _would_ have been performed, enabling developer inspection and test
 * assertions without any real side effects.
 */

export type SandboxCloudAccount = {
  csp: "azure";
  defaultLocation: string;
  displayName: string;
  id: string;
  initialized?: boolean;
  terraformBackendProvisioned?: boolean;
};

export type SandboxEnvironmentSecret = {
  environmentName: string;
  owner: string;
  repo: string;
  secretName: string;
};

export type SandboxOperationEntry = {
  operation: string;
  params: Record<string, unknown>;
  timestamp: number;
};

export type SandboxPullRequest = {
  base: string;
  body: string;
  head: string;
  owner: string;
  repo: string;
  title: string;
  url: string;
};

export type SandboxRepository = {
  branches: string[];
  name: string;
  owner: string;
};

export type SandboxState = {
  cloudAccounts: SandboxCloudAccount[];
  environmentSecrets: SandboxEnvironmentSecret[];
  operationLog: SandboxOperationEntry[];
  pullRequests: SandboxPullRequest[];
  repositories: SandboxRepository[];
};

export const createEmptySandboxState = (): SandboxState => ({
  cloudAccounts: [],
  environmentSecrets: [],
  operationLog: [],
  pullRequests: [],
  repositories: [],
});

/**
 * Records an operation in the sandbox log.
 */
export const logOperation = (
  state: SandboxState,
  operation: string,
  params: Record<string, unknown>,
): void => {
  state.operationLog.push({ operation, params, timestamp: Date.now() });
};
