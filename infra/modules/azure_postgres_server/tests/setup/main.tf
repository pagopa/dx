terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.116, < 5.0"
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
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_postgres_server/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create PostgreSQL for test"
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

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "tags" {
  value = local.tags
}
