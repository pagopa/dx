# Comparison baseline for `../compliant/main.tf` authored with the DX Terraform modules.
#
# This file is for comparison and validation only. It is used by `make compare`
# and `make demo-module`, and is not meant to be `terraform apply`-d.
#
# Read it side-by-side with ../compliant/main.tf:
#   - both target the same intent (function app + backing storage,
#     private networking, slot, alerts, and storage wiring);
#   - ../compliant/main.tf has a few hundred lines of plain azurerm_*;
#   - this file has ~50 lines, because the dx modules hide every safe-default
#     and every sibling resource (storage account, app service plan, private
#     endpoints, role assignments, alerts, subnet allocation)
#     behind a single `module` call;
#   - the OPA policy bundle in ../../policies/ is what guarantees the
#     plain-azurerm version on the left cannot drift away from the defaults
#     baked into the module on the right.

terraform {
  required_version = ">= 1.13.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

# Naming inputs the dx provider uses to derive every resource name.
locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "platform"
    app_name        = "poc"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS700 - ENGINEERING"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/tree/main/opa-poc/terraform/dx-modules"
  }
}

# Pre-existing networking — the function app module attaches to it.
data "azurerm_virtual_network" "this" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

data "azurerm_subnet" "pep" {
  name                 = "dx-d-itn-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.this.name
  resource_group_name  = data.azurerm_virtual_network.this.resource_group_name
}

# Pre-existing resource group for the function app.
data "azurerm_resource_group" "this" {
  name = "dx-d-itn-common-rg-01"
}

# Reserve a free /24 inside the vnet for the function app subnet.
resource "dx_available_subnet_cidr" "func" {
  virtual_network_id = data.azurerm_virtual_network.this.id
  prefix_length      = 24
}

# ─────────────────────────────────────────────────────────────────────────────
# This single module call expands into resources roughly comparable to:
#   - azurerm_storage_account                  (with module-safe defaults)
#   - azurerm_private_endpoint                 (5 endpoints: storage + sites)
#   - azurerm_service_plan                     (P1v3 / Premium per use_case)
#   - azurerm_linux_function_app               (HTTPS only, MSI, vnet integration, …)
#   - azurerm_linux_function_app_slot          (staging slot)
#   - azurerm_subnet                           (function app delegation)
#   - azurerm_storage_account_network_rules    (default deny)
#   - azurerm_role_assignment                  (function MSI → storage)
#   - azurerm_monitor_metric_alert             (2 alerts)
# in ../compliant/main.tf.
# ─────────────────────────────────────────────────────────────────────────────
module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 5.0"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = data.azurerm_resource_group.this.name

  virtual_network = {
    name                = data.azurerm_virtual_network.this.name
    resource_group_name = data.azurerm_virtual_network.this.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = dx_available_subnet_cidr.func.cidr_block

  health_check_path = "/health"

  app_settings      = {}
  slot_app_settings = {}

  tags = local.tags
}
