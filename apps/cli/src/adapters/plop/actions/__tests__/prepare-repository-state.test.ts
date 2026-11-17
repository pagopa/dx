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
  withLock: vi.fn(),
}));
vi.mock("../../../azure/repository-state-storage.js", () => ({
  makeRepositoryStateStorage: () => ({
    exists: mocks.exists,
    withLock: mocks.withLock,
  }),
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: () => mocks.terraform }));

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
    await fs.mkdir(path.join(directory, "infra", "repository"), {
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
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    mocks.terraform.mockResolvedValue({ exitCode: 0, stdout: "" });
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
    expect(mocks.withLock).not.toHaveBeenCalled();
  });
});
