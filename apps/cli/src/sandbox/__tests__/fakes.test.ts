import { describe, expect, it } from "vitest";

import { RepositoryNotFoundError } from "../../domain/github.js";
import {
  FakeCloudAccountRepository,
  FakeCloudAccountService,
  FakeGitHubService,
  makeFakeReleaseClient,
  makeFakeWorkspaceEffects,
} from "../fakes.js";
import { createEmptySandboxState, type SandboxState } from "../state.js";

const stateWithAccounts = (): SandboxState => ({
  ...createEmptySandboxState(),
  cloudAccounts: [
    {
      csp: "azure",
      defaultLocation: "italynorth",
      displayName: "DEV-Test",
      id: "sub-1",
      initialized: false,
      terraformBackendProvisioned: false,
    },
  ],
  repositories: [{ branches: ["main"], name: "my-repo", owner: "pagopa" }],
});

describe("FakeGitHubService", () => {
  it("getRepository throws RepositoryNotFoundError for unknown repos", async () => {
    const state = createEmptySandboxState();
    const github = new FakeGitHubService(state);

    await expect(github.getRepository("pagopa", "nonexistent")).rejects.toThrow(
      RepositoryNotFoundError,
    );
    expect(state.operationLog).toHaveLength(1);
    expect(state.operationLog[0].operation).toBe("github.getRepository");
  });

  it("getRepository returns a repository when it exists in state", async () => {
    const state = stateWithAccounts();
    const github = new FakeGitHubService(state);

    const repo = await github.getRepository("pagopa", "my-repo");

    expect(repo.name).toBe("my-repo");
    expect(repo.owner).toBe("pagopa");
  });

  it("createPullRequest records the PR in state", async () => {
    const state = createEmptySandboxState();
    const github = new FakeGitHubService(state);

    const pr = await github.createPullRequest({
      base: "main",
      body: "test",
      head: "feature",
      owner: "pagopa",
      repo: "test",
      title: "My PR",
    });

    expect(pr.url).toContain("pagopa/test/pull/1");
    expect(state.pullRequests).toHaveLength(1);
    expect(state.pullRequests[0].title).toBe("My PR");
  });

  it("createBranch adds the branch to an existing repo", async () => {
    const state = stateWithAccounts();
    const github = new FakeGitHubService(state);

    await github.createBranch({
      branchName: "feature/x",
      fromRef: "main",
      owner: "pagopa",
      repo: "my-repo",
    });

    expect(state.repositories[0].branches).toContain("feature/x");
  });
});

describe("FakeCloudAccountRepository", () => {
  it("lists cloud accounts from sandbox state", async () => {
    const state = stateWithAccounts();
    const repo = new FakeCloudAccountRepository(state);

    const accounts = await repo.list();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].displayName).toBe("DEV-Test");
  });
});

describe("FakeCloudAccountService", () => {
  it("provisionTerraformBackend marks account as provisioned", async () => {
    const state = stateWithAccounts();
    const service = new FakeCloudAccountService(state);

    const backend = await service.provisionTerraformBackend(
      state.cloudAccounts[0],
      { name: "dev", prefix: "dx" },
    );

    expect(backend.type).toBe("azurerm");
    expect(state.cloudAccounts[0].terraformBackendProvisioned).toBe(true);
  });

  it("isInitialized returns false before initialize and true after", async () => {
    const state = stateWithAccounts();
    const service = new FakeCloudAccountService(state);

    await expect(
      service.isInitialized("sub-1", { name: "dev", prefix: "dx" }),
    ).resolves.toBe(false);

    await service.initialize(state.cloudAccounts[0], {
      name: "dev",
      prefix: "dx",
    });

    await expect(
      service.isInitialized("sub-1", { name: "dev", prefix: "dx" }),
    ).resolves.toBe(true);
  });
});

describe("makeFakeWorkspaceEffects", () => {
  it("publishRepository records the repository and PR in state", async () => {
    const state = createEmptySandboxState();
    const effects = makeFakeWorkspaceEffects(state);

    const result = await effects.publishRepository({
      repoDescription: "A test",
      repoName: "new-repo",
      repoOwner: "pagopa",
    });

    expect(result.isOk()).toBe(true);
    const { pr, repository } = result._unsafeUnwrap();
    expect(repository.name).toBe("new-repo");
    expect(pr?.url).toContain("pagopa/new-repo/pull/1");
    expect(state.repositories).toHaveLength(1);
    expect(state.pullRequests).toHaveLength(1);
    expect(state.operationLog).toHaveLength(1);
    expect(state.operationLog[0].operation).toBe("workspace.publishRepository");
  });
});

describe("makeFakeReleaseClient", () => {
  it("returns deterministic terraform version", async () => {
    const client = makeFakeReleaseClient();

    const response = await client.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      { owner: "hashicorp", repo: "terraform" },
    );

    expect(response.data.tag_name).toBe("v1.9.0");
  });

  it("returns deterministic pre-commit-terraform version", async () => {
    const client = makeFakeReleaseClient();

    const response = await client.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      { owner: "antonbabenko", repo: "pre-commit-terraform" },
    );

    expect(response.data.tag_name).toBe("v1.96.0");
  });

  it("returns fallback for unknown repos", async () => {
    const client = makeFakeReleaseClient();

    const response = await client.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      { owner: "some", repo: "other" },
    );

    expect(response.data.tag_name).toBe("v1.0.0");
  });
});
