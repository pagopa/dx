/**
 * Backend configuration roundtrips preserve providers and reject unsafe inputs.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RepositoryStateDestination } from "../../../domain/repository-state.js";

import { terraformLiteral } from "../literal.js";
import {
  readRepositoryBackend,
  writeRepositoryBackend,
} from "../repository-backend.js";

const destination: RepositoryStateDestination = {
  backend: {
    resourceGroupName: "tfstate-rg",
    storageAccountName: "tfstatest",
    subscriptionId: "sub-id",
    type: "azurerm",
  },
  containerName: "terraform-state",
  key: "dx/payments/repository.tfstate",
};

describe("repository backend configuration", () => {
  let directory: string;
  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-backend-test-"));
    await fs.writeFile(
      path.join(directory, "providers.tf"),
      'terraform {\n  required_providers {\n    github = {\n      source = "integrations/github"\n    }\n  }\n}\nprovider "github" {\n  owner = "pagopa"\n}\n',
    );
  });
  afterEach(async () => {
    await fs.rm(directory, { recursive: true });
  });

  it("inserts a literal Azure backend without losing provider configuration", async () => {
    await writeRepositoryBackend(directory, destination);
    await expect(readRepositoryBackend(directory)).resolves.toEqual(
      destination,
    );
    const content = await fs.readFile(
      path.join(directory, "providers.tf"),
      "utf8",
    );
    expect(content).toContain('source = "integrations/github"');
    expect(content).toContain('owner = "pagopa"');
    expect(content).toContain("use_azuread_auth     = true");
  });

  it("detects existing backend configuration in any Terraform file", async () => {
    await writeRepositoryBackend(directory, destination);
    await fs.rename(
      path.join(directory, "providers.tf"),
      path.join(directory, "backend.tf"),
    );
    await expect(readRepositoryBackend(directory)).resolves.toEqual(
      destination,
    );
  });

  it("rejects incomplete or interpolated backend configuration instead of replacing it", async () => {
    await fs.writeFile(
      path.join(directory, "backend.tf"),
      'terraform {\n backend "azurerm" {\n key = "${var.domain}/repository.tfstate"\n }\n}\n',
    );
    await expect(readRepositoryBackend(directory)).rejects.toThrow(
      "Cannot safely read",
    );
  });

  it("rejects other backend types and multiple backend declarations", async () => {
    await fs.writeFile(
      path.join(directory, "backend.tf"),
      'terraform { backend "s3" {} }\n',
    );
    await expect(readRepositoryBackend(directory)).rejects.toThrow(
      '"s3" is not supported',
    );
    await writeRepositoryBackend(directory, destination);
    await expect(readRepositoryBackend(directory)).rejects.toThrow("Multiple");
  });

  it("escapes HCL template markers in strings", () => {
    expect(terraformLiteral("${value}/%{if true}")).toBe(
      '"$${value}/%%{if true}"',
    );
  });
});
