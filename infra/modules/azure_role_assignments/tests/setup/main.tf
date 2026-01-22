terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.114, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_role_assignments/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create role assignments for test"
  }
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subscription" "current" {}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

resource "azurerm_user_assigned_identity" "id" {
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  name                = "${module.naming_convention.prefix}-id-role-${module.naming_convention.suffix}"

  tags = local.tags
}

resource "azurerm_servicebus_namespace" "this" {
  name                = "dx-d-itn-playground-sb-01"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  sku                 = "Standard"

  tags = local.tags
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "identity_name" {
  value = azurerm_user_assigned_identity.id.name
}

output "principal_id" {
  value = azurerm_user_assigned_identity.id.principal_id
}

output "subscription_id" {
  value = data.azurerm_subscription.current.subscription_id
}

output "sb_namespace" {
  value = {
    name                = azurerm_servicebus_namespace.this.name
    resource_group_name = azurerm_servicebus_namespace.this.resource_group_name
    id                  = azurerm_servicebus_namespace.this.id
  }
}
