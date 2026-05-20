/**
 * Fake services for dry-run / test mode.
 *
 * These implementations are backed by SandboxState rather than real cloud APIs.
 * They record all operations in the operation log for inspection and assertions.
 */

import { okAsync, type ResultAsync } from "neverthrow";

import { type ReleaseClient } from "../adapters/plop/dependencies.js";
import { type Payload as MonorepoPayload } from "../adapters/plop/generators/monorepo/index.js";
import {
  type CloudAccount,
  type CloudAccountRepository,
  type CloudAccountService,
} from "../domain/cloud-account.js";
import { type EnvironmentId } from "../domain/environment.js";
import {
  type CreateBranchParams,
  type CreateOrUpdateEnvironmentSecretParams,
  FileContent,
  FileNotFoundError,
  type GetFileContentParams,
  type GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
  type UpdateFileParams,
} from "../domain/github.js";
import { type TerraformBackend } from "../domain/remote-backend.js";
import { type WorkspaceEffects } from "../domain/workspace-effects.js";
import { logOperation, type SandboxState } from "./state.js";

// -- Fake GitHub Service --

export class FakeCloudAccountRepository implements CloudAccountRepository {
  #state: SandboxState;

  constructor(state: SandboxState) {
    this.#state = state;
  }

  async list(): Promise<CloudAccount[]> {
    return this.#state.cloudAccounts.map((a) => ({
      csp: a.csp,
      defaultLocation: a.defaultLocation,
      displayName: a.displayName,
      id: a.id,
    }));
  }
}

// -- Fake Cloud Account Repository --

export class FakeCloudAccountService implements CloudAccountService {
  #state: SandboxState;

  constructor(state: SandboxState) {
    this.#state = state;
  }

  async getTerraformBackend(
    cloudAccountId: string,
    environment: EnvironmentId,
  ): Promise<TerraformBackend | undefined> {
    logOperation(this.#state, "cloud.getTerraformBackend", {
      cloudAccountId,
      environment,
    });
    const account = this.#state.cloudAccounts.find(
      (a) => a.id === cloudAccountId,
    );
    if (account?.terraformBackendProvisioned) {
      return {
        resourceGroupName: `${environment.prefix}-${environment.name}-tf-rg`,
        storageAccountName: `${environment.prefix}${environment.name}tfst`,
        subscriptionId: cloudAccountId,
        type: "azurerm",
      };
    }
    return undefined;
  }

  async hasUserPermissionToInitialize(
    cloudAccountId: string,
  ): Promise<boolean> {
    logOperation(this.#state, "cloud.hasUserPermissionToInitialize", {
      cloudAccountId,
    });
    return true;
  }

  async initialize(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
  ): Promise<void> {
    logOperation(this.#state, "cloud.initialize", {
      cloudAccountId: cloudAccount.id,
      environment,
    });
    const account = this.#state.cloudAccounts.find(
      (a) => a.id === cloudAccount.id,
    );
    if (account) {
      account.initialized = true;
    }
  }

  async isInitialized(
    cloudAccountId: string,
    environment: EnvironmentId,
  ): Promise<boolean> {
    logOperation(this.#state, "cloud.isInitialized", {
      cloudAccountId,
      environment,
    });
    const account = this.#state.cloudAccounts.find(
      (a) => a.id === cloudAccountId,
    );
    return account?.initialized ?? false;
  }

  async provisionTerraformBackend(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
  ): Promise<TerraformBackend> {
    logOperation(this.#state, "cloud.provisionTerraformBackend", {
      cloudAccountId: cloudAccount.id,
      environment,
    });
    const account = this.#state.cloudAccounts.find(
      (a) => a.id === cloudAccount.id,
    );
    if (account) {
      account.terraformBackendProvisioned = true;
    }
    return {
      resourceGroupName: `${environment.prefix}-${environment.name}-tf-rg`,
      storageAccountName: `${environment.prefix}${environment.name}tfst`,
      subscriptionId: cloudAccount.id,
      type: "azurerm",
    };
  }
}

// -- Fake Cloud Account Service --

export class FakeGitHubService implements GitHubService {
  #state: SandboxState;

  constructor(state: SandboxState) {
    this.#state = state;
  }

  async createBranch(params: CreateBranchParams): Promise<void> {
    logOperation(this.#state, "github.createBranch", { ...params });
    const repo = this.#state.repositories.find(
      (r) => r.name === params.repo && r.owner === params.owner,
    );
    if (repo) {
      repo.branches.push(params.branchName);
    }
  }

  async createOrUpdateEnvironmentSecret(
    params: CreateOrUpdateEnvironmentSecretParams,
  ): Promise<void> {
    logOperation(this.#state, "github.createOrUpdateEnvironmentSecret", {
      environmentName: params.environmentName,
      owner: params.owner,
      repo: params.repo,
      secretName: params.secretName,
    });
    this.#state.environmentSecrets.push({
      environmentName: params.environmentName,
      owner: params.owner,
      repo: params.repo,
      secretName: params.secretName,
    });
  }

  async createPullRequest(params: {
    base: string;
    body: string;
    head: string;
    owner: string;
    repo: string;
    title: string;
  }): Promise<PullRequest> {
    const url = `https://github.com/${params.owner}/${params.repo}/pull/${this.#state.pullRequests.length + 1}`;
    logOperation(this.#state, "github.createPullRequest", { ...params, url });
    this.#state.pullRequests.push({ ...params, url });
    return new PullRequest(url);
  }

  async getFileContent(params: GetFileContentParams): Promise<FileContent> {
    logOperation(this.#state, "github.getFileContent", { ...params });
    throw new FileNotFoundError(params.path);
  }

  async getRepository(owner: string, name: string): Promise<Repository> {
    logOperation(this.#state, "github.getRepository", { name, owner });
    const repo = this.#state.repositories.find(
      (r) => r.name === name && r.owner === owner,
    );
    if (!repo) {
      throw new RepositoryNotFoundError(owner, name);
    }
    return new Repository(name, owner);
  }

  async updateFile(params: UpdateFileParams): Promise<void> {
    logOperation(this.#state, "github.updateFile", { ...params });
  }
}

// -- Fake Workspace Effects --

export const makeFakeWorkspaceEffects = (
  state: SandboxState,
): WorkspaceEffects => ({
  publishRepository(
    payload: MonorepoPayload,
  ): ResultAsync<{ pr?: PullRequest; repository: Repository }, Error> {
    logOperation(state, "workspace.publishRepository", {
      repoName: payload.repoName,
      repoOwner: payload.repoOwner,
    });
    const repository = new Repository(payload.repoName, payload.repoOwner);
    state.repositories.push({
      branches: ["main", "features/scaffold-workspace"],
      name: payload.repoName,
      owner: payload.repoOwner,
    });
    const prUrl = `https://github.com/${payload.repoOwner}/${payload.repoName}/pull/1`;
    const pr = new PullRequest(prUrl);
    state.pullRequests.push({
      base: "main",
      body: "This PR contains the scaffolded monorepo structure.",
      head: "features/scaffold-workspace",
      owner: payload.repoOwner,
      repo: payload.repoName,
      title: "Scaffold repository",
      url: prUrl,
    });
    return okAsync({ pr, repository });
  },
});

// -- Deterministic Release Client --

/**
 * A fake release client that returns deterministic version strings
 * without making any network calls. Used in dry-run mode.
 */
export const makeFakeReleaseClient = (): ReleaseClient => ({
  request: (async (_route: string, options?: Record<string, unknown>) => {
    const repo = (options as undefined | { repo?: string })?.repo ?? "unknown";
    const versionMap: Record<string, string> = {
      "pre-commit-terraform": "v1.96.0",
      terraform: "v1.9.0",
    };
    const tagName = versionMap[repo] ?? "v1.0.0";
    return { data: { tag_name: tagName }, status: 200 };
  }) as ReleaseClient["request"],
});
