/**
 * Placement consent runs before generation and keeps configured backends pinned.
 */
import inquirer from "inquirer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { CloudAccountService } from "../../../../../domain/cloud-account.js";

import { writeRepositoryBackend } from "../../../../terraform/repository-backend.js";
import { collectRepositoryStateDestination } from "../repository-state.js";
import { getPayload } from "./fixtures.js";

vi.mock("inquirer");

describe("repository state placement consent", () => {
  let directory: string;
  let originalCwd: string;
  const service = mock<CloudAccountService>();
  const backend = {
    resourceGroupName: "state-rg",
    storageAccountName: "statest",
    subscriptionId: "subscription-dev",
    type: "azurerm" as const,
  };

  beforeEach(async () => {
    originalCwd = process.cwd();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-consent-test-"));
    await fs.mkdir(path.join(directory, "infra", "repository"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(directory, "infra", "repository", "providers.tf"),
      "terraform {\n}\n",
    );
    process.chdir(directory);
    vi.mocked(inquirer.prompt).mockReset();
    service.getTerraformBackend.mockResolvedValue(backend);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(directory, { recursive: true });
  });

  it("shows the full persistent destination and requires explicit confirmation", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });
    const result = await collectRepositoryStateDestination(
      getPayload(),
      service,
      false,
      false,
    );
    expect(result.destination.key).toBe("dx/mytest/repository.tfstate");
    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        default: false,
        message: expect.stringContaining("This destination is permanent"),
      }),
    );
    const question = vi.mocked(inquirer.prompt).mock.lastCall?.[0];
    expect(JSON.stringify(question)).toContain("subscription-dev");
    expect(JSON.stringify(question)).toContain("terraform-state");
  });

  it("requires --yes for first-time non-interactive placement", async () => {
    await expect(
      collectRepositoryStateDestination(getPayload(), service, true, false),
    ).rejects.toThrow("Pass --yes");
    expect(inquirer.prompt).not.toHaveBeenCalled();
    await expect(
      collectRepositoryStateDestination(getPayload(), service, true, true),
    ).resolves.toMatchObject({ status: "pending" });
  });

  it("stops without any environment actions when placement is declined", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });
    await expect(
      collectRepositoryStateDestination(getPayload(), service, false, false),
    ).rejects.toThrow("No environment actions have run");
    await expect(
      fs.readdir(path.join(directory, "infra", "repository")),
    ).resolves.toEqual(["providers.tf"]);
  });

  it("keeps the original backend when a later environment selects another account", async () => {
    const destination = {
      backend,
      containerName: "terraform-state",
      key: "dx/mytest/repository.tfstate",
    };
    await writeRepositoryBackend(
      path.join(directory, "infra", "repository"),
      destination,
    );
    const payload = getPayload();
    payload.env.name = "ced-prod";
    payload.env.prefix = "ced";
    service.getTerraformBackend.mockResolvedValue({
      ...backend,
      subscriptionId: "subscription-prod",
    });
    await expect(
      collectRepositoryStateDestination(payload, service, true, false),
    ).resolves.toEqual({ destination, status: "pending" });
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("previews the exact backend names that provisioning will create", async () => {
    service.getTerraformBackend.mockResolvedValue(undefined);
    const result = await collectRepositoryStateDestination(
      getPayload(true),
      service,
      true,
      true,
    );
    expect(result.destination.backend).toEqual({
      resourceGroupName: "dx-d-weu-tfstate-rg-01",
      storageAccountName: "dxdweutfstatest01",
      subscriptionId: "test-subscription-id",
      type: "azurerm",
    });
  });
});
