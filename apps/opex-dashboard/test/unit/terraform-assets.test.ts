/**
 * Unit tests for terraform asset generation utilities.
 */

import { describe, expect, it } from "vitest";

import {
  generateBackendTfvars,
  generateMainTf,
  generateTerraformTfvars,
  generateVariablesTf,
} from "@/builders/azure-dashboard/terraform-assets.js";

describe("generateBackendTfvars", () => {
  it("should generate backend.tfvars with all fields", () => {
    const backend = {
      containerName: "tfstate",
      key: "test.tfstate",
      resourceGroupName: "test-rg",
      storageAccountName: "teststorage",
    };

    const result = generateBackendTfvars(backend);

    expect(result).toContain('resource_group_name  = "test-rg"');
    expect(result).toContain('storage_account_name = "teststorage"');
    expect(result).toContain('container_name       = "tfstate"');
    expect(result).toContain('key                  = "test.tfstate"');
    expect(result).toContain('use_azuread_auth    = "true"');
  });

  it("should generate backend.tfvars with empty fields when backend is undefined", () => {
    const result = generateBackendTfvars();

    expect(result).toContain("resource_group_name  = ");
    expect(result).toContain("storage_account_name = ");
    expect(result).toContain("container_name       = ");
    expect(result).toContain("key                  = ");
    expect(result).toContain('use_azuread_auth    = "true"');
  });
});

describe("generateMainTf", () => {
  it("should generate main.tf content", () => {
    const result = generateMainTf();

    expect(result).toContain('required_version = ">=1.1.5"');
    expect(result).toContain('version = ">= 3.86.0, <=3.116.0"');
    expect(result).toContain('backend "azurerm" {}');
    expect(result).toContain('provider "azurerm"');
  });
});

describe("generateTerraformTfvars", () => {
  it("should generate terraform.tfvars with all fields", () => {
    const envConfig = {
      envShort: "d",
      prefix: "test",
    };

    const result = generateTerraformTfvars(envConfig);

    expect(result).toContain('prefix    = "test"');
    expect(result).toContain('env_short = "d"');
  });

  it("should generate terraform.tfvars with empty fields when envConfig is undefined", () => {
    const result = generateTerraformTfvars();

    expect(result).toContain("prefix    = ");
    expect(result).toContain("env_short = ");
  });
});

describe("generateVariablesTf", () => {
  it("should generate variables.tf content", () => {
    const result = generateVariablesTf();

    expect(result).toContain('variable "prefix"');
    expect(result).toContain('variable "env_short"');
    expect(result).toContain('variable "tags"');
    expect(result).toContain("length(var.prefix) <= 6");
    expect(result).toContain("length(var.env_short) <= 1");
  });
});
