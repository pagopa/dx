locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind
    instance_number = tonumber(var.environment.instance_number)
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_log_analytics_workspace" "logs" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "log_analytics" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location

  tags = var.tags
}

# Random base instance number regenerated on every test run to ensure isolation
# across concurrent or repeated test executions.
# Base range (10–24) ensures all derived instance numbers stay within 10–99.
resource "random_integer" "instance_base" {
  min = 10
  max = 24
  keepers = {
    run_timestamp = timestamp()
  }
}

resource "azurerm_container_app_environment" "sut" {
  name                       = provider::dx::resource_name(merge(local.naming_config, { resource_type = "container_app_environment" }))
  resource_group_name        = azurerm_resource_group.sut.name
  location                   = var.environment.location
  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.logs.id

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name,
    ]
  }

  timeouts {
    create = "60m"
  }

  tags = var.tags
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.sut.id
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}

output "instance_numbers" {
  value = {
    default     = tostring(random_integer.instance_base.result)
    development = tostring(random_integer.instance_base.result + 25)
    autoscaler  = tostring(random_integer.instance_base.result + 50)
  }
}
