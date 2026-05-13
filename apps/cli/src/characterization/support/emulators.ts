/**
 * Local backend emulators for dx-cli characterization suites.
 * They replace remote GitHub and Azure collaborators while keeping command flows observable.
 */

import { okAsync } from "neverthrow";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

import type {
  CloudAccount,
  CloudAccountRepository,
  CloudAccountService,
} from "../../domain/cloud-account.js";
import type { EnvironmentId } from "../../domain/environment.js";
import type { GitHubRepo } from "../../domain/github-repo.js";
import type { TerraformBackend } from "../../domain/remote-backend.js";

import {
  AuthorizationResult,
  type AuthorizationService,
  type RequestAuthorizationInput,
} from "../../domain/authorization.js";
import {
  type CreateBranchParams,
  type CreateOrUpdateEnvironmentSecretParams,
  type FileContent,
  FileNotFoundError,
  type GetFileContentParams,
  type GitHubAppCredentials,
  type GitHubService,
  PullRequest,
  Repository,
  RepositoryNotFoundError,
  type UpdateFileParams,
} from "../../domain/github.js";

type EnvironmentSecretRecord = Omit<
  CreateOrUpdateEnvironmentSecretParams,
  "secretValue"
> & {
  secretValue: string;
};

type PullRequestRecord = {
  base: string;
  body: string;
  head: string;
  owner: string;
  repo: string;
  title: string;
  url: string;
};

const environmentShort: Record<EnvironmentId["name"], string> = {
  dev: "d",
  prod: "p",
  uat: "u",
};

const locationShort: Record<string, string> = {
  italynorth: "itn",
  westeurope: "weu",
};

const pathExists = async (value: string): Promise<boolean> => {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
};

const redactSecret = (secretName: string, secretValue: string): string =>
  secretName === "GH_APP_KEY" ? "<redacted-gh-app-key>" : secretValue;

type InitializationRecord = {
  cloudAccountId: string;
  cloudAccountName: string;
  githubEnvironmentName: string;
  identityClientId: string;
  keyVaultName: string;
  tags: Record<string, string>;
};

type ProvisionedBackendRecord = TerraformBackend & {
  cloudAccountId: string;
};

export class AuthorizationServiceEmulator implements AuthorizationService {
  #requests: RequestAuthorizationInput[] = [];

  constructor(
    private readonly pullRequestBaseUrl = "https://github.local/pagopa/eng-azure-authorization/pull",
  ) {}

  requestAuthorization(input: RequestAuthorizationInput) {
    this.#requests.push(input);
    return okAsync(
      new AuthorizationResult(
        `${this.pullRequestBaseUrl}/${this.#requests.length}`,
      ),
    );
  }

  snapshot(): { requests: RequestAuthorizationInput[] } {
    return {
      requests: [...this.#requests],
    };
  }
}

export class CloudAccountRepositoryEmulator implements CloudAccountRepository {
  constructor(private readonly cloudAccounts: CloudAccount[]) {}

  async list(): Promise<CloudAccount[]> {
    return [...this.cloudAccounts];
  }
}

export class CloudAccountServiceEmulator implements CloudAccountService {
  #initializations: InitializationRecord[] = [];
  #keyVaultSecrets: {
    keyVaultName: string;
    names: string[];
  }[] = [];
  #provisionedBackends = new Map<string, ProvisionedBackendRecord>();

  async getTerraformBackend(
    cloudAccountId: CloudAccount["id"],
    environment: EnvironmentId,
  ): Promise<TerraformBackend | undefined> {
    return this.#provisionedBackends.get(
      `${cloudAccountId}:${environment.name}:${environment.prefix}`,
    );
  }

  async hasUserPermissionToInitialize(): Promise<boolean> {
    return true;
  }

  async initialize(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
    runnerAppCredentials: GitHubAppCredentials,
    github: GitHubRepo,
    gitHubService: GitHubService,
    tags: Record<string, string> = {},
  ): Promise<void> {
    const envShort = environmentShort[environment.name];
    const locShort = locationShort[cloudAccount.defaultLocation] ?? "itn";
    const githubEnvironmentName = `bootstrapper-${environment.name}-cd`;
    const identityClientId = `${environment.prefix}-${envShort}-${locShort}-bootstrap-id-01-client-id`;
    const keyVaultName = `${environment.prefix}-${envShort}-${locShort}-github-runners-kv-01`;

    await Promise.all([
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "ARM_CLIENT_ID",
        secretValue: identityClientId,
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "ARM_TENANT_ID",
        secretValue: "tenant-characterization",
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "ARM_SUBSCRIPTION_ID",
        secretValue: cloudAccount.id,
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "GH_APP_ID",
        secretValue: runnerAppCredentials.id,
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "GH_APP_CLIENT_ID",
        secretValue: runnerAppCredentials.clientId,
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "GH_APP_INSTALLATION_ID",
        secretValue: runnerAppCredentials.installationId,
      }),
      gitHubService.createOrUpdateEnvironmentSecret({
        environmentName: githubEnvironmentName,
        owner: github.owner,
        repo: github.repo,
        secretName: "GH_APP_KEY",
        secretValue: runnerAppCredentials.key,
      }),
    ]);

    this.#initializations.push({
      cloudAccountId: cloudAccount.id,
      cloudAccountName: cloudAccount.displayName,
      githubEnvironmentName,
      identityClientId,
      keyVaultName,
      tags,
    });
    this.#keyVaultSecrets.push({
      keyVaultName,
      names: [
        "github-runner-app-id",
        "github-runner-app-installation-id",
        "github-runner-app-key",
      ],
    });
  }

  async isInitialized(
    cloudAccountId: CloudAccount["id"],
    environment: EnvironmentId,
  ): Promise<boolean> {
    return this.#initializations.some(
      (record) =>
        record.cloudAccountId === cloudAccountId &&
        record.githubEnvironmentName === `bootstrapper-${environment.name}-cd`,
    );
  }

  async provisionTerraformBackend(
    cloudAccount: CloudAccount,
    environment: EnvironmentId,
  ): Promise<TerraformBackend> {
    const envShort = environmentShort[environment.name];
    const locShort = locationShort[cloudAccount.defaultLocation] ?? "itn";
    const backend: ProvisionedBackendRecord = {
      cloudAccountId: cloudAccount.id,
      resourceGroupName: `${environment.prefix}-${envShort}-${locShort}-tfstate-rg-01`,
      storageAccountName: `${environment.prefix}${envShort}${locShort}tfstatest01`,
      subscriptionId: cloudAccount.id,
      type: "azurerm",
    };

    this.#provisionedBackends.set(
      `${cloudAccount.id}:${environment.name}:${environment.prefix}`,
      backend,
    );

    return backend;
  }

  snapshot(): {
    initializations: InitializationRecord[];
    keyVaultSecrets: { keyVaultName: string; names: string[] }[];
    provisionedBackends: ProvisionedBackendRecord[];
  } {
    return {
      initializations: [...this.#initializations].sort((left, right) =>
        left.cloudAccountId.localeCompare(right.cloudAccountId),
      ),
      keyVaultSecrets: [...this.#keyVaultSecrets].sort((left, right) =>
        left.keyVaultName.localeCompare(right.keyVaultName),
      ),
      provisionedBackends: [...this.#provisionedBackends.values()].sort(
        (left, right) =>
          left.cloudAccountId.localeCompare(right.cloudAccountId),
      ),
    };
  }
}

export class GitHubServiceEmulator implements GitHubService {
  #environmentSecrets: EnvironmentSecretRecord[] = [];
  #pullRequests: PullRequestRecord[] = [];

  constructor(
    private readonly remoteRoot: string,
    private readonly repositoryBaseUrl: string,
    private readonly browserBaseUrl = "https://github.local",
  ) {}

  async createBranch(params: CreateBranchParams): Promise<void> {
    void params;
    throw new Error("Branch creation is not implemented in this emulator.");
  }

  async createOrUpdateEnvironmentSecret(
    params: CreateOrUpdateEnvironmentSecretParams,
  ): Promise<void> {
    this.#environmentSecrets.push({
      ...params,
      secretValue: redactSecret(params.secretName, params.secretValue),
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
    const url = `${this.browserBaseUrl}/${params.owner}/${params.repo}/pull/${this.#pullRequests.length + 1}`;
    this.#pullRequests.push({ ...params, url });
    return new PullRequest(url);
  }

  async getFileContent(params: GetFileContentParams): Promise<FileContent> {
    throw new FileNotFoundError(params.path);
  }

  async getRepository(owner: string, name: string): Promise<Repository> {
    const repositoryPath = path.join(this.remoteRoot, owner, `${name}.git`);

    if (!(await pathExists(repositoryPath))) {
      throw new RepositoryNotFoundError(owner, name);
    }

    return new Repository(name, owner, this.repositoryBaseUrl);
  }

  snapshot(): {
    environmentSecrets: EnvironmentSecretRecord[];
    pullRequests: PullRequestRecord[];
  } {
    return {
      environmentSecrets: [...this.#environmentSecrets].sort((left, right) =>
        `${left.environmentName}:${left.secretName}`.localeCompare(
          `${right.environmentName}:${right.secretName}`,
        ),
      ),
      pullRequests: [...this.#pullRequests],
    };
  }

  async updateFile(params: UpdateFileParams): Promise<void> {
    void params;
    throw new Error("File updates are not implemented in this emulator.");
  }
}

export const ensureDirectory = async (value: string): Promise<void> => {
  await mkdir(value, { recursive: true });
};
