locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  tags = merge(var.tags, {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure API Management ${var.test_kind} tests"
  })
}

data "azurerm_virtual_network" "vnet" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

data "azurerm_log_analytics_workspace" "logs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "log_analytics"
  }))
  resource_group_name = data.azurerm_resource_group.rg.name
}

resource "random_integer" "instance_base" {
  min = 10
  max = 70
  keepers = {
    run_timestamp = timestamp()
  }
}
