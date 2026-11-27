/**
 * Exercises destination confirmation and reporting through the registered plop action.
 */
import nodePlop from "node-plop";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  terraform: vi.fn(),
  terraformRunner: vi.fn(),
  withLock: vi.fn(),
}));
vi.mock("../../../azure/repository-state-storage.js", () => ({
  makeRepositoryStateStorage: () => ({
    exists: mocks.exists,
    withLock: mocks.withLock,
  }),
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.terraformRunner }));

import type { DeploymentEnvironmentOutputPayload } from "../../index.js";

import setPrepareRepositoryState from "../prepare-repository-state.js";

const originalDestination = {
  containerName: "terraform-state",
  key: "legacy/repository.tfstate",
  resourceGroupName: "dev-rg",
  storageAccountName: "devstorage",
  subscriptionId: "dev-sub",
};

describe("prepare repository state action", () => {
  let directory: string;
  let payload: DeploymentEnvironmentOutputPayload;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "prepare-state-"));
    await fs.mkdir(path.join(directory, "infra", "repository", ".terraform"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(directory, "infra", "repository", "providers.tf"),
      `
      terraform {
        backend "azurerm" {
          resource_group_name = "dev-rg"
          storage_account_name = "devstorage"
          subscription_id = "dev-sub"
          container_name = "terraform-state"
          key = "legacy/repository.tfstate"
        }
      }
    `,
    );
    await fs.writeFile(
      path.join(directory, "infra", "repository", "github.tf"),
      'provider "github" { owner = "PagoPA" }\n',
    );
    await fs.writeFile(
      path.join(directory, "infra", "repository", "main.tf"),
      'module "github_repository" { repository = { name = "repo" } }\n',
    );
    await fs.writeFile(
      path.join(
        directory,
        "infra",
        "repository",
        ".terraform",
        "terraform.tfstate",
      ),
      JSON.stringify({
        backend: {
          config: {
            container_name: originalDestination.containerName,
            key: originalDestination.key,
            resource_group_name: originalDestination.resourceGroupName,
            storage_account_name: originalDestination.storageAccountName,
            subscription_id: originalDestination.subscriptionId,
          },
          type: "azurerm",
        },
      }),
    );
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    mocks.terraform.mockResolvedValue({ exitCode: 0, stdout: "" });
    mocks.terraformRunner.mockReturnValue(mocks.terraform);
    mocks.withLock.mockImplementation(async (_destination, task) =>
      task(new AbortController().signal),
    );
    payload = {
      env: {
        cloudAccounts: [
          {
            csp: "azure",
            defaultLocation: "italynorth",
            displayName: "Prod",
            id: "prod-sub",
          },
        ],
        name: "prod",
        prefix: "dx",
      },
      github: { owner: "pagopa", repo: "repo" },
      repositoryStateDestination: originalDestination,
      tags: { CostCenter: "TS720 - DEV EX", Owner: "DX" },
      terraform: {
        backend: {
          containerName: "payments-tf-state",
          resourceGroupName: "prod-rg",
          storageAccountName: "prodstorage",
          subscriptionId: "prod-sub",
          type: "azurerm",
        },
      },
      workspace: { domain: "payments" },
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    await fs.rm(directory, { force: true, recursive: true });
  });

  const run = async () => {
    const plop = await nodePlop();
    setPrepareRepositoryState(plop, { getToken: async () => null });
    plop.setGenerator("test", {
      actions: [{ type: "prepareRepositoryState" }],
    });
    return plop.getGenerator("test").runActions(payload);
  };

  it("locks, verifies and reports the original backend rather than the new environment's backend", async () => {
    await expect(run()).resolves.toMatchObject({ failures: [] });

    expect(mocks.withLock).toHaveBeenCalledWith(
      originalDestination,
      expect.any(Function),
    );
    expect(payload.repositoryState).toEqual({
      destination: originalDestination,
      status: "already-remote",
    });
    expect(mocks.terraform).toHaveBeenCalledTimes(2);
    expect(mocks.terraformRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        env: {
          GITHUB_BASE_URL: "https://api.github.com/",
          GITHUB_ORGANIZATION: "",
          GITHUB_OWNER: "pagopa",
        },
      }),
    );
  });

  it.each([
    ["same name under a different owner", { owner: "other-org", repo: "repo" }],
    ["different repository name", { owner: "pagopa", repo: "other-repo" }],
  ])(
    "rejects %s before acquiring the lock or touching Terraform",
    async (_, github) => {
      payload.github = github;

      await expect(run()).resolves.toMatchObject({
        failures: [
          expect.objectContaining({
            error: expect.stringContaining(
              `does not target ${github.owner}/${github.repo}`,
            ),
          }),
        ],
      });
      expect(mocks.withLock).not.toHaveBeenCalled();
      expect(mocks.terraform).not.toHaveBeenCalled();
    },
  );

  it("rejects a module wired to a different GitHub provider", async () => {
    await fs.writeFile(
      path.join(directory, "infra", "repository", "main.tf"),
      `module "github_repository" {
        repository = { name = "repo" }
        providers = { github = github.other }
      }`,
    );

    await expect(run()).resolves.toMatchObject({
      failures: [
        expect.objectContaining({
          error: expect.stringContaining("use the default GitHub provider"),
        }),
      ],
    });
    expect(mocks.withLock).not.toHaveBeenCalled();
    expect(mocks.terraform).not.toHaveBeenCalled();
  });

  it("rejects an override that could redirect the GitHub provider", async () => {
    await fs.writeFile(
      path.join(directory, "infra", "repository", "github_override.tf"),
      'provider "github" { owner = "other-org" }\n',
    );

    await expect(run()).resolves.toMatchObject({
      failures: [
        expect.objectContaining({
          error: expect.stringContaining("override Terraform configuration"),
        }),
      ],
    });
    expect(mocks.withLock).not.toHaveBeenCalled();
    expect(mocks.terraform).not.toHaveBeenCalled();
  });

  it("rejects a changed or unconfirmed destination before running Terraform", async () => {
    payload.repositoryStateDestination = {
      ...originalDestination,
      key: "different.tfstate",
    };

    await expect(run()).resolves.toMatchObject({
      failures: [
        expect.objectContaining({
          error: expect.stringContaining("changed since confirmation"),
        }),
      ],
    });
    expect(mocks.terraform).not.toHaveBeenCalled();
  });
});
