/**
 * Terraform asset generation utilities.
 * Generates Terraform configuration files dynamically instead of copying from static assets.
 */

import type {
  BackendConfig,
  EnvironmentConfig,
} from "../../core/config/config.schema.js";

/**
 * Generate backend.tfvars content for Terraform backend configuration.
 */
export function generateBackendTfvars(backend?: BackendConfig): string {
  return `resource_group_name  = ${backend?.resourceGroupName ? `"${backend.resourceGroupName}"` : ""}
storage_account_name = ${backend?.storageAccountName ? `"${backend.storageAccountName}"` : ""}
container_name       = ${backend?.containerName ? `"${backend.containerName}"` : ""}
key                  = ${backend?.key ? `"${backend.key}"` : ""}
use_azuread_auth    = "true"
`;
}

/**
 * Generate variables.tf content with variable definitions.
 */
export function generateMainTf(): string {
  const terraformVersion = ">=1.1.5";
  const azurermVersion = ">= 3.86.0, <=3.116.0";

  return `terraform {
  required_version = "${terraformVersion}"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "${azurermVersion}"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {}
}
`;
}

/**
 * Generate terraform.tfvars content for environment-specific variables.
 */
export function generateTerraformTfvars(envConfig?: EnvironmentConfig): string {
  return `prefix    = ${envConfig?.prefix ? `"${envConfig.prefix}"` : ""}
env_short = ${envConfig?.envShort ? `"${envConfig.envShort}"` : ""}
`;
}

/**
 * Generate 99_variables.tf content with variable definitions.
 */
export function generateVariablesTf(): string {
  return `variable "prefix" {
  type    = string
  validation {
    condition = (
      length(var.prefix) <= 6
    )
    error_message = "Max length is 6 chars."
  }
}

variable "env_short" {
  type = string
  validation {
    condition = (
      length(var.env_short) <= 1
    )
    error_message = "Max length is 1 chars."
  }
}

variable "tags" {
  type = map(any)
  default = {
    CreatedBy = "Terraform"
  }
}
`;
}
