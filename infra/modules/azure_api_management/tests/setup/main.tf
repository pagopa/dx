terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
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

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create APIM for test"
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
}

data "azurerm_virtual_network" "vnet" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}


data "azurerm_log_analytics_workspace" "logs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test"
    resource_type = "log_analytics"
  }))
  resource_group_name = data.azurerm_resource_group.rg.name
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "vnet" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "tags" {
  value = local.tags
}
