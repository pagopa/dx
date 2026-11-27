/**
 * Verifies exact placement is accepted before state-changing actions can run.
 */
import inquirer from "inquirer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { CloudAccountService } from "../../../domain/cloud-account.js";
import type { Payload } from "../generators/environment/prompts.js";

import { confirmRepositoryStatePlacement } from "../confirm-repository-state.js";

const backend = {
  containerName: "payments-tf-state",
  resourceGroupName: "dev-rg",
  storageAccountName: "devstorage",
  subscriptionId: "dev-sub",
  type: "azurerm",
} as const;
const service = mock<CloudAccountService>();

describe("repository state placement confirmation", () => {
  let directory: string;
  let payload: Payload;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "repository-confirm-"));
    await fs.mkdir(path.join(directory, "infra", "repository"), {
      recursive: true,
    });
    vi.spyOn(process, "cwd").mockReturnValue(directory);
    vi.spyOn(inquirer, "prompt").mockResolvedValue({ confirmed: true });
    service.getTerraformBackend.mockResolvedValue(backend);
    payload = {
      env: {
        cloudAccounts: [
          {
            csp: "azure",
            defaultLocation: "italynorth",
            displayName: "Dev",
            id: "dev-sub",
          },
        ],
        name: "dev",
        prefix: "dx",
      },
      github: { owner: "pagopa", repo: "example" },
      tags: { CostCenter: "TS720 - DEV EX", Owner: "DX" },
      workspace: { domain: "payments" },
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await fs.rm(directory, { force: true, recursive: true });
  });

  it("shows all destination fields and permanence before asking for approval", async () => {
    await confirmRepositoryStatePlacement(payload, service, {}, false);

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(
          /environment "dev"[\s\S]*dev-sub[\s\S]*dev-rg[\s\S]*devstorage[\s\S]*payments-tf-state[\s\S]*dx\/payments\/repository\.tfstate[\s\S]*permanent/,
        ),
      }),
    );
    expect(payload.repositoryStateDestination).toEqual({
      containerName: "payments-tf-state",
      key: "dx/payments/repository.tfstate",
      resourceGroupName: backend.resourceGroupName,
      storageAccountName: backend.storageAccountName,
      subscriptionId: backend.subscriptionId,
    });
  });

  it("previews the same deterministic destination that provisioning will use", async () => {
    service.getTerraformBackend.mockResolvedValue(undefined);
    payload.init = {
      cloudAccountsToInitialize: payload.env.cloudAccounts,
      terraformBackend: { cloudAccount: payload.env.cloudAccounts[0] },
    };

    await confirmRepositoryStatePlacement(payload, service, {}, false);

    expect(payload.repositoryStateDestination).toEqual({
      containerName: "payments-tf-state",
      key: "dx/payments/repository.tfstate",
      resourceGroupName: "dx-d-itn-tfstate-rg-01",
      storageAccountName: "dxditntfstatest01",
      subscriptionId: "dev-sub",
    });
    expect(service.provisionTerraformBackend).not.toHaveBeenCalled();
  });

  it("does not accept rejected placement or write repository configuration", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirmed: false });

    await expect(
      confirmRepositoryStatePlacement(payload, service, {}, false),
    ).rejects.toThrow(/not confirmed/);

    expect(payload.repositoryStateDestination).toBeUndefined();
    await expect(
      fs.readdir(path.join(directory, "infra", "repository")),
    ).resolves.toEqual([]);
  });

  it("honors --yes without prompting in non-interactive mode", async () => {
    await confirmRepositoryStatePlacement(
      payload,
      service,
      { init: { confirm: true } },
      true,
    );

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(payload.repositoryStateDestination?.key).toBe(
      "dx/payments/repository.tfstate",
    );
  });

  it("requires --yes for first placement in non-interactive mode", async () => {
    await expect(
      confirmRepositoryStatePlacement(payload, service, {}, true),
    ).rejects.toThrow(/--yes/);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("retains the configured backend when adding another environment", async () => {
    await fs.writeFile(
      path.join(directory, "infra", "repository", "providers.tf"),
      `
      terraform {
        backend "azurerm" {
          resource_group_name = "original-rg"
          storage_account_name = "originalstorage"
          subscription_id = "original-sub"
          container_name = "terraform-state"
          key = "legacy/repository.tfstate"
        }
      }
    `,
    );
    payload.env.name = "prod";

    await confirmRepositoryStatePlacement(payload, service, {}, true);

    expect(inquirer.prompt).not.toHaveBeenCalled();
    expect(payload.repositoryStateDestination).toEqual({
      containerName: "terraform-state",
      key: "legacy/repository.tfstate",
      resourceGroupName: "original-rg",
      storageAccountName: "originalstorage",
      subscriptionId: "original-sub",
    });
  });
});
