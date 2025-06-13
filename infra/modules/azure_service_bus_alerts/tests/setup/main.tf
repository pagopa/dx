terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.3.0"
    }
  }
}

locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "Developer Experience"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_service_bus_alerts/tests"
    Test           = "true"
    TestName       = "Create ServiceBus Alerts for test"
  }

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.environment.location
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

resource "azurerm_servicebus_namespace" "this" {
  name                = "dx-d-itn-modules-test-sbns-01"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = data.azurerm_resource_group.rg.location
  sku                 = "Standard"

  tags = local.tags
}

resource "azurerm_monitor_action_group" "dx" {
  name                = "dx-d-itn-modules-test-ag-01"
  resource_group_name = data.azurerm_resource_group.rg.name
  short_name          = "dx-alert"

  tags = local.tags
}

output "environment" {
  value = local.environment
}

output "tags" {
  value = local.tags
}

output "service_bus_namespace_id" {
  value = azurerm_servicebus_namespace.this.id
}

output "action_group_id" {
  value = azurerm_monitor_action_group.dx.id
}
